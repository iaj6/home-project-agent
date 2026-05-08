<script setup lang="ts">
import { computed } from 'vue';
import type { LaborEstimate } from '@home-advisor/shared';
import ConfidenceBadge from './ConfidenceBadge.vue';
import CostSourceChip from './CostSourceChip.vue';

const props = defineProps<{ labor: LaborEstimate }>();

function currency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const multiplierLabel = computed(() => {
  const m = props.labor.regionalMultiplier;
  if (m === undefined || m === null) return null;
  const pct = Math.round((m - 1) * 100);
  if (Math.abs(pct) < 1) return 'regional avg';
  return pct > 0 ? `+${pct}% regional` : `${pct}% regional`;
});
</script>

<template>
  <div class="labor">
    <div class="labor-header">
      <div class="lh-left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <path d="M20 8v6"/>
          <path d="M23 11h-6"/>
        </svg>
        <h3>Professional Labor Estimate</h3>
      </div>
      <ConfidenceBadge :level="labor.confidence" label="Labor" />
    </div>

    <div class="range">
      <div class="range-line">
        <span class="low">{{ currency(labor.lowUsd) }}</span>
        <div class="bar">
          <div class="bar-fill"></div>
        </div>
        <span class="high">{{ currency(labor.highUsd) }}</span>
      </div>
      <div class="range-sub">
        <span v-if="labor.nationalAverage">National avg: <strong>{{ currency(labor.nationalAverage) }}</strong></span>
        <span v-if="multiplierLabel">{{ multiplierLabel }}</span>
      </div>
    </div>

    <div v-if="labor.breakdown?.length" class="breakdown">
      <div class="bd-label">Breakdown</div>
      <ul>
        <li v-for="(line, idx) in labor.breakdown" :key="idx">
          <span class="task">{{ line.task }}</span>
          <span class="money">{{ currency(line.lowUsd) }} – {{ currency(line.highUsd) }}</span>
        </li>
      </ul>
    </div>

    <div v-if="labor.sources.length" class="sources">
      <span class="sources-label">Sources:</span>
      <CostSourceChip v-for="(source, idx) in labor.sources" :key="idx" :source="source" />
    </div>
  </div>
</template>

<style scoped>
.labor {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}
.labor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.lh-left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--text-primary);
}
.lh-left h3 {
  font-family: var(--font-heading);
  font-size: 0.95rem;
  font-weight: 700;
}
.range {
  margin-bottom: 1.1rem;
}
.range-line {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}
.low {
  color: var(--success);
}
.high {
  color: var(--primary-hover);
}
.bar {
  flex: 1;
  height: 6px;
  background: var(--bg-surface);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}
.bar-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, var(--success), var(--warning), var(--primary-hover));
}
.range-sub {
  margin-top: 0.4rem;
  display: flex;
  gap: 1rem;
  font-family: var(--font-heading);
  font-size: 0.78rem;
  color: var(--text-tertiary);
  font-weight: 500;
}
.breakdown {
  margin-bottom: 1rem;
}
.bd-label {
  font-family: var(--font-heading);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-tertiary);
  letter-spacing: 0.06em;
  margin-bottom: 0.4rem;
}
.breakdown ul {
  list-style: none;
  padding: 0;
}
.breakdown li {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0;
  border-bottom: 1px dashed var(--border-light);
  font-size: 0.88rem;
}
.breakdown li:last-child {
  border-bottom: 0;
}
.task {
  color: var(--text-primary);
}
.money {
  font-family: var(--font-heading);
  color: var(--text-secondary);
  font-weight: 600;
}
.sources {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.sources-label {
  font-family: var(--font-heading);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-tertiary);
  letter-spacing: 0.06em;
}
</style>
