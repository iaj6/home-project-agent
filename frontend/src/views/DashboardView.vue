<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import ProjectCard from '../components/ProjectCard.vue';

const router = useRouter();
const projectStore = useProjectStore();

onMounted(() => {
  projectStore.fetchProjects();
});
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div>
        <h1>My Projects</h1>
        <p class="subtitle">Manage your home improvement plans</p>
      </div>
      <button class="new-btn" @click="router.push('/new')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Project
      </button>
    </div>

    <div v-if="projectStore.loading && projectStore.projects.length === 0" class="loading">
      <div class="loading-pulse"></div>
      <span>Loading projects...</span>
    </div>

    <div v-else-if="projectStore.projects.length === 0" class="empty">
      <div class="empty-illustration">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/>
          <path d="M17.64 15L22 10.64"/>
          <path d="M20.91 11.7l-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/>
        </svg>
      </div>
      <h2>No projects yet</h2>
      <p>Start your first home improvement project and get AI-powered guidance.</p>
      <button class="new-btn" @click="router.push('/new')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Start a Project
      </button>
    </div>

    <div v-else class="project-grid">
      <ProjectCard
        v-for="(project, index) in projectStore.projects"
        :key="project.id"
        :project="project"
        :style="{ animationDelay: `${index * 0.06}s` }"
      />
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-family: var(--font-heading);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
}

.subtitle {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  margin-top: 0.2rem;
}

.new-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.new-btn:hover {
  background: var(--primary-hover);
  box-shadow: 0 4px 16px rgba(184, 92, 56, 0.25);
  transform: translateY(-1px);
}

.new-btn:active {
  transform: translateY(0);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 1rem;
  color: var(--text-tertiary);
  font-family: var(--font-heading);
  font-size: 0.9rem;
}

.loading-pulse {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-light);
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(0.85); opacity: 0.5; }
  50% { transform: scale(1.15); opacity: 1; }
}

.empty {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 2px dashed var(--border);
}

.empty-illustration {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  background: var(--bg-surface);
  border-radius: 50%;
  color: var(--text-tertiary);
  margin-bottom: 1.25rem;
}

.empty h2 {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
}
</style>
