<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  score: number;
  label: string;
}>();

const color = computed(() => {
  if (props.score <= 3) return 'var(--success)';
  if (props.score <= 6) return 'var(--warning)';
  return 'var(--danger)';
});

/* SVG arc for a semi-circle gauge */
const radius = 54;
const circumference = Math.PI * radius; /* half circle */
const strokeDash = computed(() => (props.score / 10) * circumference);
</script>

<template>
  <div class="score-gauge">
    <div class="gauge-visual">
      <svg viewBox="0 0 120 72" class="gauge-svg">
        <!-- Background arc -->
        <path
          d="M 6 66 A 54 54 0 0 1 114 66"
          fill="none"
          stroke="var(--border-light)"
          stroke-width="10"
          stroke-linecap="round"
        />
        <!-- Score arc -->
        <path
          d="M 6 66 A 54 54 0 0 1 114 66"
          fill="none"
          :stroke="color"
          stroke-width="10"
          stroke-linecap="round"
          :stroke-dasharray="`${strokeDash} ${circumference}`"
          class="score-arc"
        />
        <!-- Center score number -->
        <text x="60" y="60" text-anchor="middle" class="score-text" :fill="color">
          {{ props.score }}
        </text>
        <text x="60" y="70" text-anchor="middle" class="score-max">
          /10
        </text>
      </svg>
    </div>
    <span class="gauge-label">{{ props.label }}</span>
  </div>
</template>

<style scoped>
.score-gauge {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
}

.gauge-visual {
  width: 140px;
  margin-bottom: 0.25rem;
}

.gauge-svg {
  width: 100%;
  height: auto;
  overflow: visible;
}

.score-arc {
  transition: stroke-dasharray 0.8s var(--ease-out);
}

.score-text {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 800;
}

.score-max {
  font-family: var(--font-mono);
  font-size: 9px;
  fill: var(--text-tertiary);
}

.gauge-label {
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.03em;
}
</style>
