<script setup lang="ts">
import type { CostSource } from '@home-advisor/shared';

defineProps<{ source: CostSource }>();
</script>

<template>
  <a :href="source.url" target="_blank" rel="noopener noreferrer" class="chip">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
    <span class="site">{{ source.siteName }}</span>
    <span v-if="source.snippet" class="tooltip">"{{ source.snippet }}"</span>
  </a>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.55rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-family: var(--font-heading);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-decoration: none;
  position: relative;
  cursor: pointer;
  transition: all 0.15s ease;
}
.chip:hover {
  background: var(--primary-light);
  color: var(--primary-hover);
  border-color: var(--primary-muted);
}
.site {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  max-width: 280px;
  padding: 0.5rem 0.65rem;
  background: var(--bg-dark);
  color: var(--text-inverse);
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 0.78rem;
  line-height: 1.4;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  z-index: 5;
  white-space: normal;
  letter-spacing: 0;
}
.chip:hover .tooltip {
  display: block;
}
</style>
