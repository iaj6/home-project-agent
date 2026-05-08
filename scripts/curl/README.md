# curl scripts

Poking the services during local dev. All assume the Firebase emulators are running:

```
firebase emulators:start --only firestore,auth,functions
```

and ports match `firebase.json`:
- auth: 9102
- functions: 5402
- firestore: 8402
- emulator UI: 4402

Start the agent-worker in another terminal:

```
cd agent-worker && PORT=8787 npm run dev
```

## Quick checks

```bash
# Agent-worker health
./scripts/curl/agent-worker-health.sh

# Kick off an agent run directly (bypasses Cloud Functions)
./scripts/curl/trigger-agent-run.sh <runId> <projectId> <userId>

# Call a callable function via the emulator's admin bypass
./scripts/curl/call-function.sh startProject '{"category":"deck-building","title":"T","description":"test","zipCode":"30303"}'
```
