import * as functions from "firebase-functions";

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
  constructor(private readonly workerUrl: string) {}

  async publishAgentRun(job: AgentRunJobPayload): Promise<void> {
    try {
      const res = await fetch(`${this.workerUrl}/agent-run`, {
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
    } catch (err: unknown) {
      logger.error("failed to publish to local agent-worker", {
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
