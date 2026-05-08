<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  disabledNotice?: string;
}>();

const emit = defineEmits<{
  send: [content: string];
}>();

const input = ref('');

function handleSend() {
  const content = input.value.trim();
  if (!content || props.loading || props.disabled) return;
  emit('send', content);
  input.value = '';
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}
</script>

<template>
  <div class="chat-input" :class="{ disabled: props.disabled }">
    <div class="input-inner">
      <textarea
        v-model="input"
        :placeholder="props.placeholder ?? 'Describe your project or answer the question...'"
        :disabled="props.loading || props.disabled"
        @keydown="handleKeydown"
        rows="2"
      ></textarea>
      <button
        :disabled="!input.trim() || props.loading || props.disabled"
        @click="handleSend"
        :title="props.loading ? 'Sending...' : 'Send message'"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
    <p v-if="props.disabled && props.disabledNotice" class="disabled-notice">{{ props.disabledNotice }}</p>
  </div>
</template>

<style scoped>
.chat-input {
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--border-light);
  background: var(--bg-card);
}

.chat-input.disabled {
  opacity: 0.6;
}

.input-inner {
  display: flex;
  gap: 0.65rem;
  align-items: flex-end;
}

textarea {
  flex: 1;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  resize: none;
  font-family: var(--font-body);
  font-size: 0.925rem;
  color: var(--text-primary);
  background: var(--bg-base);
  line-height: 1.5;
  transition: all 0.2s ease;
}

textarea::placeholder {
  color: var(--text-tertiary);
}

textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
  background: var(--bg-card);
}

textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

button:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: scale(1.05);
}

button:active:not(:disabled) {
  transform: scale(0.95);
}

button:disabled {
  background: var(--border);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.disabled-notice {
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: var(--text-tertiary);
  text-align: center;
  font-family: var(--font-heading);
}
</style>
