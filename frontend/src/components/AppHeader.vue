<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

async function handleLogout() {
  await authStore.logout();
  router.push('/');
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <div class="left">
        <span class="logo" @click="router.push('/')">
          <span class="logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </span>
          <span class="logo-text">Home Advisor</span>
        </span>
        <nav v-if="authStore.user">
          <button
            :class="{ active: route.path === '/dashboard' }"
            @click="router.push('/dashboard')"
          >Dashboard</button>
          <button
            :class="{ active: route.path === '/new' }"
            @click="router.push('/new')"
          >New Project</button>
        </nav>
      </div>
      <div v-if="authStore.user" class="right">
        <span v-if="authStore.user.email" class="email">{{ authStore.user.email }}</span>
        <span v-else class="email muted">guest session</span>
        <button class="logout-btn" @click="handleLogout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: var(--bg-dark);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 3px solid var(--primary);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 60px;
  max-width: 1200px;
  margin: 0 auto;
}

.left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.logo:hover {
  opacity: 0.85;
}

.logo-icon {
  color: var(--primary);
  display: flex;
  align-items: center;
}

.logo-text {
  font-family: var(--font-display);
  font-size: 1.3rem;
  color: var(--text-inverse);
  letter-spacing: -0.01em;
}

nav {
  display: flex;
  gap: 0.25rem;
}

nav button {
  padding: 0.4rem 0.85rem;
  border: none;
  background: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
  letter-spacing: 0.02em;
}

nav button:hover {
  color: var(--text-inverse);
  background: var(--bg-dark-lighter);
}

nav button.active {
  color: var(--primary);
  background: rgba(184, 92, 56, 0.12);
}

.right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.email {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  font-family: var(--font-body);
}
.email.muted { font-style: italic; opacity: 0.7; }

.logout-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: var(--font-heading);
  color: var(--text-tertiary);
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: var(--bg-dark-lighter);
  color: var(--text-inverse);
  border-color: rgba(255,255,255,0.2);
}
</style>
