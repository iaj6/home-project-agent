<script setup lang="ts">
import type { ConversationMessage } from '@home-helper/shared';

const props = defineProps<{
  message: ConversationMessage;
}>();

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div class="chat-message" :class="props.message.role">
    <div class="bubble">
      <p class="content">{{ props.message.content }}</p>
      <span class="time">{{ formatTime(props.message.createdAt) }}</span>
    </div>
  </div>
</template>

<style scoped>
.chat-message {
  display: flex;
  animation: msgIn 0.3s var(--ease-out) both;
}

@keyframes msgIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message.user {
  justify-content: flex-end;
}

.chat-message.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 72%;
  padding: 0.85rem 1.1rem;
  word-wrap: break-word;
}

.user .bubble {
  background: var(--bg-dark);
  color: var(--text-inverse);
  border-radius: var(--radius-lg) var(--radius-lg) 6px var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.assistant .bubble {
  background: var(--bg-card);
  color: var(--text-primary);
  border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 6px;
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--primary);
  box-shadow: var(--shadow-sm);
}

.content {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.55;
  font-size: 0.925rem;
}

.time {
  display: block;
  font-size: 0.68rem;
  margin-top: 0.35rem;
  opacity: 0.5;
  font-family: var(--font-mono);
  letter-spacing: 0.03em;
}
</style>
