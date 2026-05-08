<script setup lang="ts">
import { computed } from 'vue';
import type { AgentRun, AgentStep } from '@home-advisor/shared';

const props = defineProps<{
  run: AgentRun | null;
  steps: AgentStep[];
  showFull?: boolean;
}>();

const emit = defineEmits<{ (e: 'open-full'): void }>();

const recent = computed(() => {
  if (props.showFull) return [...props.steps].sort((a, b) => a.index - b.index);
  return [...props.steps].sort((a, b) => b.index - a.index).slice(0, 6).reverse();
});

const phaseLabel = computed(() => {
  if (!props.run?.phase) return props.run?.status ?? '';
  switch (props.run.phase) {
    case 'plan': return 'Planning the project';
    case 'price': return 'Finding real prices';
    case 'labor': return 'Looking up labor rates';
    case 'synthesize': return 'Writing the report';
    default: return props.run.phase;
  }
});

function stepIcon(kind: AgentStep['kind']) {
  switch (kind) {
    case 'tool_call': return '🛠️';
    case 'tool_result': return '✓';
    case 'think': return '💭';
    case 'phase_transition': return '→';
    case 'final': return '✓';
    default: return '·';
  }
}
</script>

<template>
  <div class="activity" :class="{ active: run?.status === 'running', full: showFull }">
    <div class="header">
      <div class="hbd">
        <div class="gears" :class="{ spin: run?.status === 'running' }">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <div class="meta">
          <div class="phase">{{ phaseLabel }}</div>
          <div class="sub">
            <span v-if="run">${{ (run.estimatedCostUsd ?? 0).toFixed(3) }} · {{ run.toolCallCount ?? 0 }} tool calls</span>
            <span v-else>Waiting for agent…</span>
          </div>
        </div>
      </div>
      <button v-if="!showFull && run" class="open-full" @click="emit('open-full')">Show full trace →</button>
    </div>

    <ol class="steps">
      <li
        v-for="step in recent"
        :key="step.id"
        class="step"
        :class="{ error: !!step.errorMessage, running: step.kind === 'tool_call' && !step.output }"
      >
        <span class="icon">{{ stepIcon(step.kind) }}</span>
        <div class="step-main">
          <span class="summary">{{ step.summary }}</span>
          <span v-if="showFull && step.tool" class="tool">{{ step.tool }}</span>
          <span v-if="showFull && step.durationMs" class="time">{{ Math.round(step.durationMs) }}ms</span>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.activity {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
}
.activity.active {
  border-color: var(--primary-muted);
  box-shadow: 0 0 0 3px var(--primary-glow);
}
.activity.full {
  padding: 1.25rem;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
  gap: 0.75rem;
}
.hbd {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.gears {
  color: var(--primary);
  display: inline-flex;
}
.gears.spin {
  animation: spin 4s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.meta .phase {
  font-family: var(--font-heading);
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
}
.meta .sub {
  font-family: var(--font-heading);
  font-size: 0.72rem;
  color: var(--text-tertiary);
  font-weight: 500;
  letter-spacing: 0.02em;
}
.open-full {
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 0.78rem;
  font-weight: 600;
}
.open-full:hover {
  text-decoration: underline;
}
.steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.55rem;
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  font-size: 0.83rem;
  color: var(--text-secondary);
  transition: background 0.15s ease;
}
.step.running {
  background: var(--primary-light);
  animation: pulse 1.1s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
.step.error {
  background: var(--danger-light);
  color: var(--danger);
}
.step .icon {
  font-size: 0.85rem;
  min-width: 16px;
  text-align: center;
}
.step-main {
  flex: 1;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}
.summary {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity.full .summary {
  white-space: normal;
}
.tool {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--primary-hover);
  font-weight: 600;
}
.time {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--text-tertiary);
}
</style>
