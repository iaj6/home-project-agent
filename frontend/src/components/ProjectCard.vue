<script setup lang="ts">
import { useRouter } from 'vue-router';
import { CATEGORIES } from '@home-helper/shared';
import type { Project } from '@home-helper/shared';

const props = defineProps<{
  project: Project;
}>();

const router = useRouter();

function handleClick() {
  if (props.project.status === 'complete') {
    router.push(`/project/${props.project.id}/report`);
  } else {
    router.push(`/project/${props.project.id}`);
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
</script>

<template>
  <div class="project-card" @click="handleClick">
    <div class="card-accent"></div>
    <div class="card-body">
      <div class="card-top">
        <div class="icon-wrapper">
          <span class="icon">{{ CATEGORIES[props.project.category]?.icon }}</span>
        </div>
        <span class="status-badge" :class="props.project.status">
          <span class="status-dot"></span>
          {{ props.project.status }}
        </span>
      </div>
      <h3>{{ props.project.title }}</h3>
      <p class="category-label">{{ CATEGORIES[props.project.category]?.label }}</p>
      <p class="description">{{ props.project.description }}</p>
      <div class="card-footer">
        <span class="date">{{ formatDate(props.project.createdAt) }}</span>
        <span class="view-link">
          {{ props.project.status === 'complete' ? 'View Report' : 'Continue' }}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.3s var(--ease-out);
  overflow: hidden;
  position: relative;
  animation: cardEnter 0.4s var(--ease-out) both;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.project-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-3px);
  border-color: var(--border);
}

.card-accent {
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--primary-muted));
}

.card-body {
  padding: 1.25rem;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.icon-wrapper {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  font-size: 1.4rem;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-family: var(--font-heading);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;
  letter-spacing: 0.03em;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-badge.clarifying {
  background: var(--primary-light);
  color: var(--primary);
}
.status-badge.clarifying .status-dot { background: var(--primary); }

.status-badge.generating,
.status-badge.planning,
.status-badge.pricing,
.status-badge.synthesizing {
  background: var(--warning-light);
  color: var(--warning);
}
.status-badge.generating .status-dot,
.status-badge.planning .status-dot,
.status-badge.pricing .status-dot,
.status-badge.synthesizing .status-dot {
  background: var(--warning);
  animation: pulse 1.4s ease-in-out infinite;
}

.status-badge.complete {
  background: var(--success-light);
  color: var(--success);
}
.status-badge.complete .status-dot { background: var(--success); }

.status-badge.error {
  background: var(--danger-light);
  color: var(--danger);
}
.status-badge.error .status-dot { background: var(--danger); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

h3 {
  margin: 0 0 0.2rem;
  font-family: var(--font-heading);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.category-label {
  margin: 0 0 0.6rem;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  font-weight: 500;
}

.description {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-light);
}

.date {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.view-link {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--font-heading);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary);
  transition: gap 0.2s ease;
}

.project-card:hover .view-link {
  gap: 0.5rem;
}
</style>
