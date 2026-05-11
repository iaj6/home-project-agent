import * as functions from "firebase-functions";
import { GoogleAuth } from "google-auth-library";

const logger = functions.logger;

export interface AgentRunJobPayload {
  runId: string;
  projectId: string;
  userId: string;
  mode: "full" | "followup";
  followupQuestion?: string;
}

export interface JobQueue {
  publishAgentRun(job: AgentRunJobPayload): Promise<void>;
}

class LocalHttpJobQueue implements JobQueue {
  // Audience URL = the worker base URL with no path. Cached on the auth
  // client so we don't pay for token minting on every call.
  private auth: GoogleAuth = new GoogleAuth();
  private clientCache: Promise<unknown> | null = null;

  constructor(private readonly workerUrl: string) {}

  private async getClient() {
    if (!this.clientCache) {
      // getIdTokenClient mints a Google-signed OIDC ID token whose audience
      // is the Cloud Run service URL. The Cloud Run service must require
      // IAM auth (`--no-allow-unauthenticated`) and grant our compute SA
      // `roles/run.invoker` for the token to be accepted.
      this.clientCache = this.auth.getIdTokenClient(this.workerUrl);
    }
    return this.clientCache;
  }

  async publishAgentRun(job: AgentRunJobPayload): Promise<void> {
    try {
      const url = `${this.workerUrl}/agent-run`;
      // In the Firebase emulator the worker is on http://127.0.0.1:8787
      // with no auth — skip the ID token there so local dev still works.
      const isEmulator = this.workerUrl.startsWith("http://127.0.0.1")
        || this.workerUrl.startsWith("http://localhost");
      if (isEmulator) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(job),
        });
        if (!res.ok) {
          logger.warn("agent-worker returned non-ok on publish", {
            status: res.status,
            runId: job.runId,
          });
        }
        return;
      }

      const client = (await this.getClient()) as {
        request: (opts: {
          url: string;
          method: string;
          data: unknown;
          headers?: Record<string, string>;
        }) => Promise<{ status: number }>;
      };
      const res = await client.request({
        url,
        method: "POST",
        data: job,
        headers: { "content-type": "application/json" },
      });
      if (res.status < 200 || res.status >= 300) {
        logger.warn("agent-worker returned non-ok on publish", {
          status: res.status,
          runId: job.runId,
        });
      }
    } catch (err: unknown) {
      logger.error("failed to publish to agent-worker", {
        error: err instanceof Error ? err.message : String(err),
        runId: job.runId,
      });
      throw err;
    }
  }
}

class PubsubJobQueue implements JobQueue {
  constructor(private readonly topic: string) {}

  async publishAgentRun(job: AgentRunJobPayload): Promise<void> {
    // @ts-expect-error optional dep — install @google-cloud/pubsub when AGENT_QUEUE=pubsub is enabled.
    const { PubSub } = await import("@google-cloud/pubsub");
    const pubsub = new PubSub();
    const data = Buffer.from(JSON.stringify(job));
    await pubsub.topic(this.topic).publishMessage({ data });
    logger.info("published agent-run job to pubsub", {
      topic: this.topic,
      runId: job.runId,
    });
  }
}

let _queue: JobQueue | null = null;

export function getJobQueue(): JobQueue {
  if (_queue) return _queue;
  const mode = (process.env.AGENT_QUEUE ?? "local").toLowerCase();
  if (mode === "pubsub") {
    const topic = process.env.PUBSUB_TOPIC_AGENT_JOBS ?? "agent-jobs";
    _queue = new PubsubJobQueue(topic);
  } else {
    const url = process.env.AGENT_WORKER_URL ?? "http://127.0.0.1:8787";
    _queue = new LocalHttpJobQueue(url);
  }
  return _queue;
}

export function setJobQueueForTesting(queue: JobQueue): void {
  _queue = queue;
}
