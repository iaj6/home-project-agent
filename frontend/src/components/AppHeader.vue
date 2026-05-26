<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { LOGO_DARK } from '../lib/assets';

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
        <button class="logo" @click="router.push('/')" aria-label="Home Helper — back to start">
          <!-- Stamped monogram: blueprint-square + house silhouette (gpt-image) -->
          <img class="logo-mark" :src="LOGO_DARK" alt="Home Helper" width="36" height="36" />
          <span class="logo-text">
            <span class="logo-name">Home Helper</span>
            <span class="logo-tag">DRAFTED BY HANDY</span>
          </span>
        </button>
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
        <button class="logout-btn" @click="handleLogout" aria-label="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span class="logout-text">Sign Out</span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: var(--bg-dark);
  background-image: var(--grid-pattern-dark);
  background-size: 28px 28px;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(231, 201, 155, 0.18);
  box-shadow: 0 1px 0 var(--primary), 0 2px 0 rgba(184, 92, 56, 0.4);
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
  gap: 1.5rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0.25rem 0.4rem 0.25rem 0;
  font-family: inherit;
  text-align: left;
  border-radius: var(--radius-sm);
  transition: all 0.18s var(--ease-out);
}
.logo:hover { transform: translateX(-1px); }
.logo:hover .logo-mark { color: #E7C99B; }

.logo-mark {
  display: inline-block;
  width: 36px;
  height: 36px;
  object-fit: contain;
  /* Slight glow on the cream stamp so it pops on the dark header */
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
  transition: transform 0.2s var(--ease-out);
}
.logo:hover .logo-mark { transform: rotate(-3deg) scale(1.05); }

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1;
}
.logo-name {
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--text-inverse);
  letter-spacing: -0.005em;
}
.logo-tag {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.56rem;
  letter-spacing: 0.18em;
  color: var(--primary-muted);
  margin-top: 3px;
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

@media (max-width: 640px) {
  .header-inner {
    padding: 0 0.75rem;
    height: 56px;
    gap: 0.5rem;
  }
  .left { gap: 0.75rem; min-width: 0; }
  .right { gap: 0.4rem; }

  .logo { gap: 0.5rem; padding: 0.25rem 0.2rem 0.25rem 0; }
  .logo-mark { width: 30px; height: 30px; }
  .logo-name { font-size: 0.95rem; }
  .logo-tag { display: none; }

  nav { gap: 0.15rem; }
  nav button {
    padding: 0.35rem 0.55rem;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .email { display: none; }

  .logout-btn { padding: 0.35rem 0.5rem; }
  .logout-text { display: none; }
}
</style>
