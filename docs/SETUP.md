# Setting up Home Helper under your own account

This walks you through cloning the repo, swapping in your own keys + project, running locally, and deploying. Should take ~30 minutes if you already have Firebase + gcloud accounts; ~60 if you're creating them fresh.

If you'd rather hand this to an LLM, see [`CLAUDE-PROMPTS.md`](CLAUDE-PROMPTS.md) for ready-to-use prompts you can paste into Claude Code.

---

## 0. Prerequisites

- Node 20 (functions require it; the agent-worker can run on newer in dev)
- npm 10+
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- [gcloud CLI](https://cloud.google.com/sdk/docs/install)
- A Google account with billing enabled (Cloud Run + Firebase have free tiers but a billing account is required to enable APIs)

API keys to gather:
- **Anthropic API key** — https://console.anthropic.com/
- **Crawlbase token** — https://crawlbase.com/ (free tier is fine for testing). The free tier has 1000 requests; each agent run uses ~20.
- **YouTube Data API v3 key** — see step 5 below
- Optional: **ScrapingBee API key** — only if you want a fallback to Crawlbase for retailers

---

## 1. Create a Firebase + GCP project

1. Go to https://console.firebase.google.com/ → **Add project**
2. Pick a name (becomes your project ID, e.g. `my-home-helper`)
3. Disable Google Analytics (this app doesn't use it) — or leave it on, doesn't matter
4. Wait for provisioning

Then enable the services this app uses:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  firebaseextensions.googleapis.com \
  cloudfunctions.googleapis.com \
  eventarc.googleapis.com \
  pubsub.googleapis.com
```

Enable **Anonymous Authentication** in Firebase Console → Authentication → Sign-in method → Anonymous → Enable → Save. (Has to be done in the UI; no CLI flag.)

Initialize Firestore:
- Firebase Console → Firestore Database → Create database → Production mode → pick a region close to you (e.g. `us-central1`)

---

## 2. Clone + install

```bash
git clone https://github.com/iaj6/home-project-agent.git
cd home-project-agent
npm install
```

This is an npm workspace; `npm install` from root sets up `shared/`, `functions/`, `agent-worker/`, `frontend/` together.

---

## 3. Point the project at your Firebase account

Update `.firebaserc`:

```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

Configure the frontend Firebase web SDK:

```bash
cp frontend/.env.example frontend/.env.local
```

Fill in the values from Firebase Console → Project Settings → General → "Your apps" → Web app config. If you don't have a Web app yet, click **Add app** → web (`</>`) and create one.

---

## 4. Drop in the API keys

Create `functions/.env.local` with your API keys (this file is gitignored):

```bash
ANTHROPIC_API_KEY=sk-ant-...
CRAWLBASE_TOKEN=...
CRAWLBASE_JS_TOKEN=...                    # optional, JS-rendering tier
YOUTUBE_API_KEY=...
SCRAPING_BEE_API_KEY=...                  # optional second-tier fetcher

# Local-only override so the functions emulator routes agent jobs to the
# local agent-worker instead of (eventually) your deployed Cloud Run URL:
AGENT_WORKER_URL=http://127.0.0.1:8787
AGENT_QUEUE=local
```

The agent-worker reads from the same file when run with `npm run dev` (the worker startup wraps `source ../functions/.env.local`).

---

## 5. Enable YouTube Data API + restrict the key

1. https://console.cloud.google.com/apis/library/youtube.googleapis.com (make sure your project is selected at the top) → **Enable**
2. https://console.cloud.google.com/apis/credentials → **+ Create Credentials → API key**
3. Copy the key value. Click on the key to edit:
   - **Application restrictions**: None
   - **API restrictions**: Restrict key → Select APIs → check **YouTube Data API v3** → Save
4. Wait ~1 min for propagation, then paste the key into `functions/.env.local` as `YOUTUBE_API_KEY`.

---

## 6. Try it locally

Three terminals:

```bash
# Terminal 1 — Firebase emulators
firebase emulators:start --only firestore,auth,functions

# Terminal 2 — agent-worker
cd agent-worker && PORT=8787 npm run dev

# Terminal 3 — frontend
cd frontend && npm run dev
```

Visit http://localhost:5177. You'll auto-sign-in anonymously. Create a project, answer the clarification questions, watch the agent stream phases live.

A full run hits real Anthropic + Crawlbase + YouTube. Expected: ~5 minutes, ~$1 in Anthropic tokens, ~20 Crawlbase requests, 1 YouTube quota unit.

---

## 7. Deploy

### 7a. Stash secrets in Google Secret Manager

```bash
# From repo root, with .env.local sourced
set -a && source functions/.env.local && set +a

for key in ANTHROPIC_API_KEY CRAWLBASE_TOKEN CRAWLBASE_JS_TOKEN YOUTUBE_API_KEY; do
  value="${!key}"
  [ -z "$value" ] && continue
  gcloud secrets create "$key" --replication-policy=automatic 2>/dev/null || true
  printf "%s" "$value" | gcloud secrets versions add "$key" --data-file=-
done

# Grant the Cloud Run / Functions compute SA permission to read them.
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None
```

### 7b. Deploy agent-worker to Cloud Run

```bash
gcloud run deploy agent-worker \
  --source . \
  --region us-central1 \
  --no-allow-unauthenticated \
  --port 8787 --memory 2Gi --cpu 2 --timeout 900 --max-instances 5 --no-cpu-throttling \
  --update-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,CRAWLBASE_TOKEN=CRAWLBASE_TOKEN:latest,CRAWLBASE_JS_TOKEN=CRAWLBASE_JS_TOKEN:latest,YOUTUBE_API_KEY=YOUTUBE_API_KEY:latest \
  --set-env-vars GCLOUD_PROJECT=$(gcloud config get-value project)
```

The Cloud Run service URL will print at the end. Save it.

Grant the compute service account permission to invoke (functions → run):

```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud run services add-iam-policy-binding agent-worker \
  --region us-central1 \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### 7c. Wire functions → Cloud Run

Create `functions/.env.YOUR_PROJECT_ID` (replace with your actual project ID; this file is gitignored):

```
AGENT_WORKER_URL=https://your-cloud-run-url-from-previous-step
AGENT_QUEUE=local
```

### 7d. Deploy functions + Firestore rules + hosting

```bash
# Build frontend first
cd frontend && npm run build && cd ..

firebase deploy --project YOUR_PROJECT_ID
```

You should now have a working deployment at `https://YOUR_PROJECT_ID.web.app`.

---

## 8. Verify

```bash
# Hosting up?
curl -s -o /dev/null -w "%{http_code}\n" https://YOUR_PROJECT_ID.web.app

# Cloud Run blocks direct unauthenticated calls?
curl -X POST https://your-cloud-run-url/agent-run -d '{}'
# expected: 403 Forbidden
```

Open the hosting URL in a browser. Anonymous auth → create a project → watch the agent run. If it stalls at "queued", check:
- Functions logs for OIDC errors (`gcloud functions logs read sendMessage --region us-central1 --limit 20`)
- Cloud Run logs (`gcloud run services logs read agent-worker --region us-central1 --limit 30`)

---

## Common pitfalls

- **"Permission denied on secret"** during Cloud Run deploy → step 7a (grant `secretAccessor` to the compute SA) wasn't run.
- **Agent run stuck at "queued"** → `functions/.env.YOUR_PROJECT_ID` is missing or `AGENT_WORKER_URL` doesn't point to your Cloud Run. Also check `firebase emulators:start` is loading the right env file.
- **`Missing VITE_FIREBASE_API_KEY`** at build time → `frontend/.env.local` doesn't exist or isn't filled in. Vite needs all `VITE_FIREBASE_*` vars at build time (compile-time substitution).
- **Crawlbase returns Akamai challenge page (3KB)** → use the **plain** Crawlbase token, not the JS token, for Home Depot. JS-tier seems to trigger Akamai's stricter check.
- **`fetch_lowes_sku` errors** → Lowe's is dropped from the tool registry by default. The code exists for re-enable but every fetcher tier is currently bot-blocked there.

---

## Optional: regenerate brand assets

The logo and category icons live in `frontend/public/assets/` (gpt-image-1 generated). Regenerate or customize:

```bash
# OPENAI_API_KEY must be in functions/.env.local, ~/Documents/portfolio/.env,
# or shell env. ~$0.17 per asset at "high" quality.
python3 scripts/generate-assets.py --all          # generate all missing
python3 scripts/generate-assets.py logo-mark-light --force   # regen one
```

Prompts live inline in `scripts/generate-assets.py`. Edit those + re-run with `--force` to iterate.
