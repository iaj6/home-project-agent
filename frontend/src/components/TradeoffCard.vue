<script setup lang="ts">
import type { Tradeoffs } from '@home-advisor/shared';

defineProps<{ tradeoffs: Tradeoffs }>();
</script>

<template>
  <div class="tradeoff-card">
    <div class="tri">
      <div class="axis">
        <div class="axis-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Quality</span>
        </div>
        <p>{{ tradeoffs.quality }}</p>
      </div>
      <div class="axis">
        <div class="axis-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Time</span>
        </div>
        <p>{{ tradeoffs.time }}</p>
      </div>
      <div class="axis">
        <div class="axis-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span>Money</span>
        </div>
        <p>{{ tradeoffs.money }}</p>
      </div>
    </div>
    <div v-if="tradeoffs.recommendation" class="rec">
      <div class="rec-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <span>Recommendation</span>
      </div>
      <p>{{ tradeoffs.recommendation }}</p>
    </div>
  </div>
</template>

<style scoped>
.tradeoff-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
}
.tri {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.axis {
  padding: 0.75rem;
  border-right: 1px solid var(--border-light);
}
.axis:last-child {
  border-right: 0;
}
.axis-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--primary);
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 0.4rem;
}
.axis p {
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--text-primary);
}
.rec {
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  background: var(--accent-light);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
}
.rec-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent);
  font-family: var(--font-heading);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.3rem;
}
.rec p {
  font-size: 0.9rem;
  color: var(--accent);
  line-height: 1.5;
}
@media (max-width: 700px) {
  .tri {
    grid-template-columns: 1fr;
  }
  .axis {
    border-right: 0;
    border-bottom: 1px solid var(--border-light);
  }
  .axis:last-child {
    border-bottom: 0;
  }
}
</style>
