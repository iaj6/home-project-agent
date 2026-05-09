<script setup lang="ts">
import type { TaskItem } from '@home-helper/shared';

defineProps<{
  tasks: TaskItem[];
}>();

function difficultyColor(difficulty: TaskItem['difficulty']): string {
  switch (difficulty) {
    case 'easy': return 'difficulty-easy';
    case 'moderate': return 'difficulty-moderate';
    case 'hard': return 'difficulty-hard';
  }
}
</script>

<template>
  <ol class="task-list">
    <li v-for="task in tasks" :key="task.order" class="task-item">
      <div class="task-number-col">
        <span class="task-number">{{ task.order }}</span>
      </div>
      <div class="task-content">
        <div class="task-header">
          <strong class="task-name">{{ task.name }}</strong>
          <div class="task-badges">
            <span class="badge" :class="difficultyColor(task.difficulty)">{{ task.difficulty }}</span>
            <span v-if="task.requiresPermit" class="permit-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Permit
            </span>
          </div>
        </div>
        <p class="task-description">{{ task.description }}</p>
        <div class="task-meta">
          <span class="task-hours">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ~{{ task.estimatedHours }}h
          </span>
        </div>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.task-item {
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.15s ease;
}

.task-item:last-child {
  border-bottom: none;
}

.task-item:hover {
  background: var(--bg-surface);
  margin: 0 -0.75rem;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  border-radius: var(--radius-sm);
}

.task-number-col {
  flex-shrink: 0;
}

.task-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--primary-light);
  color: var(--primary);
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: 800;
  border-radius: var(--radius-sm);
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.3rem;
}

.task-name {
  font-family: var(--font-heading);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
}

.task-badges {
  display: flex;
  gap: 0.35rem;
}

.badge {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-family: var(--font-heading);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: capitalize;
  letter-spacing: 0.04em;
}

.difficulty-easy { background: var(--success-light); color: var(--success); }
.difficulty-moderate { background: var(--warning-light); color: var(--warning); }
.difficulty-hard { background: var(--danger-light); color: var(--danger); }

.permit-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-family: var(--font-heading);
  font-size: 0.68rem;
  font-weight: 700;
  background: var(--danger-light);
  color: var(--danger);
}

.task-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 0.35rem;
}

.task-meta {
  display: flex;
  gap: 1rem;
}

.task-hours {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
</style>
