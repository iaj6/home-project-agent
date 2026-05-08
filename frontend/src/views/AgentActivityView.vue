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

    <div v-if="projectStore.currentRun?.errorMessage" class="error-box">
      <strong>Error:</strong>
      <code>{{ projectStore.currentRun.errorMessage }}</code>
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
.error-box code {
  display: block;
  margin-top: 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--danger);
  white-space: pre-wrap;
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
