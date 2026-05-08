<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const isSignUp = ref(false);
const email = ref('');
const password = ref('');
const displayName = ref('');
const error = ref('');
const submitting = ref(false);

async function handleSubmit() {
  error.value = '';
  submitting.value = true;
  try {
    if (isSignUp.value) {
      await authStore.signup(email.value, password.value, displayName.value);
    } else {
      await authStore.login(email.value, password.value);
    }
    router.push('/');
  } catch (e: unknown) {
    error.value = (e as Error).message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Blueprint grid background -->
    <div class="login-bg"></div>

    <div class="login-content">
      <!-- Brand -->
      <div class="brand">
        <div class="brand-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <h1 class="brand-name">Home Advisor</h1>
        <p class="tagline">Your AI-powered home improvement partner.<br>Plan smarter. Build with confidence.</p>
      </div>

      <!-- Login Card -->
      <div class="login-card">
        <div class="tabs">
          <button :class="{ active: !isSignUp }" @click="isSignUp = false">Sign In</button>
          <button :class="{ active: isSignUp }" @click="isSignUp = true">Create Account</button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div v-if="isSignUp" class="field">
            <label for="displayName">Display Name</label>
            <input id="displayName" v-model="displayName" type="text" required placeholder="How should we address you?" />
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" v-model="email" type="email" required placeholder="you@example.com" />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" v-model="password" type="password" required placeholder="Your password" />
          </div>

          <p v-if="error" class="error">{{ error }}</p>

          <button type="submit" class="submit-btn" :disabled="submitting">
            <span v-if="submitting" class="spinner"></span>
            {{ submitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In' }}
          </button>
        </form>
      </div>

      <p class="footer-note">Free to use. No credit card required.</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--bg-dark);
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  background-image: var(--grid-pattern);
  background-size: 40px 40px;
  opacity: 0.15;
}

.login-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 2rem 1.5rem;
  animation: fadeUp 0.6s var(--ease-out) both;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.brand {
  text-align: center;
  margin-bottom: 2rem;
}

.brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  background: var(--primary);
  border-radius: var(--radius-lg);
  color: white;
  margin-bottom: 1rem;
  box-shadow: 0 4px 24px rgba(184, 92, 56, 0.35);
}

.brand-name {
  font-family: var(--font-display);
  font-size: 2.2rem;
  color: var(--text-inverse);
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
}

.tagline {
  font-family: var(--font-body);
  font-size: 0.95rem;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.login-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  padding: 1.75rem;
  border: 1px solid var(--border-light);
}

.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: 4px;
}

.tabs button {
  flex: 1;
  padding: 0.55rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  transition: all 0.25s var(--ease-out);
}

.tabs button.active {
  color: var(--text-primary);
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
}

.field {
  margin-bottom: 1.1rem;
}

.field label {
  display: block;
  margin-bottom: 0.35rem;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.03em;
}

.field input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 0.95rem;
  color: var(--text-primary);
  background: var(--bg-base);
  transition: all 0.2s ease;
}

.field input::placeholder {
  color: var(--text-tertiary);
}

.field input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
  background: var(--bg-card);
}

.error {
  color: var(--danger);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--danger-light);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--danger);
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-heading);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  letter-spacing: 0.02em;
}

.submit-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  box-shadow: 0 4px 16px rgba(184, 92, 56, 0.3);
  transform: translateY(-1px);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.footer-note {
  text-align: center;
  margin-top: 1.25rem;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  opacity: 0.6;
}
</style>
