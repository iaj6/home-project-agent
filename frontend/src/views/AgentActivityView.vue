<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import AgentActivityPanel from '../components/AgentActivityPanel.vue';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();

const projectId = route.params.id as string;
const runId = route.params.runId as string;

const retrying = ref(false);
const retryError = ref<string | null>(null);

async function retry() {
  retrying.value = true;
  retryError.value = null;
  try {
    const newRunId = await projectStore.retryProject(projectId);
    projectStore.unsubscribeRun();
    projectStore.subscribeToRun(newRunId);
    router.replace(`/project/${projectId}/run/${newRunId}`);
  } catch (e) {
    retryError.value = e instanceof Error ? e.message : String(e);
  } finally {
    retrying.value = false;
  }
}

onMounted(() => {
  projectStore.fetchProject(projectId);
  projectStore.subscribeToRun(runId);
});

onUnmounted(() => {
  projectStore.unsubscribeRun();
});

const durationLabel = computed(() => {
  const run = projectStore.currentRun;
  if (!run) return '—';
  const end = run.completedAt ?? new Date();
  const start = run.startedAt;
  const sec = Math.round((end.getTime() - start.getTime()) / 1000);
  return `${sec}s`;
});

// Categorize the raw error string into a friendly headline + remediation hint.
// The full text is still shown in a collapsible <details> so we never hide info.
const friendlyError = computed(() => {
  const raw = projectStore.currentRun?.errorMessage ?? '';
  if (!raw) return null;

  if (/parsed_output|did not return valid JSON|stop_reason/i.test(raw)) {
    return {
      title: 'The agent had trouble formatting its final output.',
      hint: 'This usually clears on retry. The plan/price/labor work it did already is preserved.',
    };
  }
  if (/429|rate.?limit|too many requests/i.test(raw)) {
    return {
      title: 'An upstream service rate-limited us.',
      hint: 'Wait a minute and retry — the limit usually clears within 60 seconds.',
    };
  }
  if (/crawlbase|home.?depot|fetch_home_depot_sku/i.test(raw)) {
    return {
      title: 'A retailer fetch hiccupped.',
      hint: 'Home Depot or our fetcher proxy returned an error. Retrying usually picks a different proxy and clears it.',
    };
  }
  if (/ECONN|ETIMED|fetch failed|network/i.test(raw)) {
    return {
      title: "Network error reaching an upstream service.",
      hint: "Check your connection or try again in a moment.",
    };
  }
  if (/budget|maxInputTokens|maxToolCalls/i.test(raw)) {
    return {
      title: "The agent hit its compute budget mid-run.",
      hint: "This is rare and usually a sign that the project is unusually complex. Retry if you'd like another attempt.",
    };
  }
  return {
    title: 'The agent run failed unexpectedly.',
    hint: 'Retry usually clears it. If the same error keeps coming up, the project may be hitting an edge case worth flagging.',
  };
});
</script>

<template>
  <div class="trace">
    <div class="trace-header">
      <button class="back-btn" @click="router.push(`/project/${projectId}/report`)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Report
      </button>
      <h1>Agent Activity</h1>
      <p class="sub">{{ projectStore.currentProject?.title }}</p>
    </div>

    <div v-if="projectStore.currentRun" class="stats">
      <div class="stat">
        <span class="stat-label">Status</span>
        <span class="stat-val" :class="projectStore.currentRun.status">{{ projectStore.currentRun.status }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Duration</span>
        <span class="stat-val">{{ durationLabel }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Tool calls</span>
        <span class="stat-val">{{ projectStore.currentRun.toolCallCount ?? 0 }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Tokens in / out</span>
        <span class="stat-val">{{ projectStore.currentRun.totalInputTokens ?? 0 }} / {{ projectStore.currentRun.totalOutputTokens ?? 0 }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Run cost</span>
        <span class="stat-val">${{ (projectStore.currentRun.estimatedCostUsd ?? 0).toFixed(3) }}</span>
      </div>
    </div>

    <AgentActivityPanel
      :run="projectStore.currentRun"
      :steps="projectStore.runSteps"
      :show-full="true"
    />

    <div v-if="friendlyError" class="error-box">
      <div class="err-headline">{{ friendlyError.title }}</div>
      <div class="err-hint">{{ friendlyError.hint }}</div>
      <details class="err-details">
        <summary>Show technical detail</summary>
        <code>{{ projectStore.currentRun?.errorMessage }}</code>
      </details>
      <div class="retry-row">
        <button class="retry-btn" :disabled="retrying" @click="retry">
          {{ retrying ? 'Retrying…' : 'Retry agent run' }}
        </button>
        <span v-if="retryError" class="retry-err">{{ retryError }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trace {
  max-width: 940px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}
.trace-header {
  margin-bottom: 1.5rem;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}
.back-btn:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}
.trace-header h1 {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 800;
}
.sub {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  margin-top: 0.2rem;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.stat {
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}
.stat-label {
  display: block;
  font-family: var(--font-heading);
  font-size: 0.7rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.stat-val {
  display: block;
  margin-top: 0.25rem;
  font-family: var(--font-heading);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}
.stat-val.running { color: var(--warning); }
.stat-val.complete { color: var(--success); }
.stat-val.error { color: var(--danger); }
.stat-val.queued { color: var(--text-tertiary); }

.error-box {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--danger-light);
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
}
.err-headline {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1rem;
  color: var(--danger);
  margin-bottom: 0.3rem;
}
.err-hint {
  font-size: 0.9rem;
  color: var(--text-primary);
  margin-bottom: 0.8rem;
  line-height: 1.4;
}
.err-details {
  margin-bottom: 0.5rem;
  font-size: 0.82rem;
}
.err-details summary {
  cursor: pointer;
  color: var(--text-tertiary);
  font-family: var(--font-heading);
  font-weight: 600;
  user-select: none;
}
.err-details summary:hover { color: var(--text-secondary); }
.err-details code {
  display: block;
  margin-top: 0.5rem;
  padding: 0.6rem 0.7rem;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--danger);
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}
.retry-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.85rem;
}
.retry-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--danger);
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.retry-btn:hover:not(:disabled) {
  background: var(--danger);
  color: var(--bg-card);
}
.retry-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.retry-err {
  font-size: 0.8rem;
  color: var(--danger);
}
</style>
