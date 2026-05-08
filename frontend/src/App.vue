<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth';
import AppHeader from './components/AppHeader.vue';

const authStore = useAuthStore();

onMounted(() => {
  authStore.init();
});
</script>

<template>
  <div class="app">
    <AppHeader v-if="authStore.user" />
    <div v-if="authStore.loading" class="app-loading">
      <div class="loading-hammer">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/>
          <path d="M17.64 15L22 10.64"/>
          <path d="M20.91 11.7l-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/>
        </svg>
      </div>
      <span>Loading...</span>
    </div>
    <router-view v-else />
  </div>
</template>

<style>
:root {
  /* ─── Palette ─── */
  --bg-base: #FAF6F1;
  --bg-surface: #F2ECE3;
  --bg-card: #FFFFFF;
  --bg-dark: #1E1B16;
  --bg-dark-lighter: #2A2520;

  --primary: #B85C38;
  --primary-hover: #9E4B2C;
  --primary-light: #F5E6DE;
  --primary-muted: #D4A088;
  --primary-glow: rgba(184, 92, 56, 0.15);

  --accent: #2C4A3E;
  --accent-light: #E3EDEA;

  --text-primary: #2D2418;
  --text-secondary: #6B5E50;
  --text-tertiary: #9C8E7E;
  --text-inverse: #FAF6F1;

  --border: #DDD3C5;
  --border-light: #EDE7DD;

  --success: #3D7C47;
  --success-light: #E8F5EA;
  --warning: #C67E2A;
  --warning-light: #FFF3E0;
  --danger: #B83232;
  --danger-light: #FDECEA;

  /* ─── Shadows ─── */
  --shadow-sm: 0 1px 2px rgba(45,36,24,0.06);
  --shadow-md: 0 4px 12px rgba(45,36,24,0.08);
  --shadow-lg: 0 8px 24px rgba(45,36,24,0.12);
  --shadow-xl: 0 16px 48px rgba(45,36,24,0.16);
  --shadow-card: 0 1px 3px rgba(45,36,24,0.06), 0 1px 2px rgba(45,36,24,0.04);
  --shadow-card-hover: 0 8px 24px rgba(45,36,24,0.10), 0 2px 6px rgba(45,36,24,0.06);

  /* ─── Radii ─── */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* ─── Typography ─── */
  --font-display: 'Instrument Serif', Georgia, serif;
  --font-heading: 'Bricolage Grotesque', system-ui, sans-serif;
  --font-body: 'Karla', system-ui, sans-serif;
  --font-mono: 'Fira Code', 'Consolas', monospace;

  /* ─── Transitions ─── */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* ─── Grid pattern for blueprint effect ─── */
  --grid-pattern: url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L40 40 40 0' fill='none' stroke='%23DDD3C5' stroke-width='0.5' opacity='0.4'/%3E%3C/svg%3E");
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-body);
  color: var(--text-primary);
  background: var(--bg-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  line-height: 1.2;
}

/* ─── Scrollbar ─── */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: var(--bg-surface);
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* ─── Selection ─── */
::selection {
  background: var(--primary-light);
  color: var(--primary-hover);
}

/* ─── Focus ring ─── */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* ─── Loading ─── */
.app-loading {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  color: var(--text-tertiary);
  gap: 1rem;
  font-family: var(--font-heading);
  font-size: 0.9rem;
  letter-spacing: 0.03em;
}

.loading-hammer {
  animation: hammerSwing 1.2s var(--ease-out) infinite;
  transform-origin: bottom left;
  color: var(--primary);
}

@keyframes hammerSwing {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-15deg); }
  50% { transform: rotate(5deg); }
  75% { transform: rotate(-8deg); }
}

/* ─── Global Transitions ─── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
