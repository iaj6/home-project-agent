<script setup lang="ts">
import { computed } from 'vue';
import type { Confidence } from '@home-helper/shared';

const props = defineProps<{
  level: Confidence;
  label?: string;
  compact?: boolean;
}>();

const meta = computed(() => {
  switch (props.level) {
    case 'high':
      return { label: 'High', dot: '#3D7C47', bg: 'var(--success-light)', fg: 'var(--success)' };
    case 'medium':
      return { label: 'Medium', dot: '#C67E2A', bg: 'var(--warning-light)', fg: 'var(--warning)' };
    case 'low':
    default:
      return { label: 'Low', dot: '#B83232', bg: 'var(--danger-light)', fg: 'var(--danger)' };
  }
});
</script>

<template>
  <span class="confidence" :class="{ compact }" :style="{ background: meta.bg, color: meta.fg }">
    <span class="dot" :style="{ background: meta.dot }"></span>
    <span v-if="!compact" class="txt">{{ label ?? 'Confidence' }}: {{ meta.label }}</span>
    <span v-else class="txt">{{ meta.label }}</span>
  </span>
</template>

<style scoped>
.confidence {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-family: var(--font-heading);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
}
.confidence.compact {
  font-size: 0.62rem;
  padding: 0.12rem 0.4rem;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.txt {
  font-family: var(--font-heading);
}
</style>
