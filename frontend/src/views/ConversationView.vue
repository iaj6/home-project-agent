<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import ChatMessage from '../components/ChatMessage.vue';
import ChatInput from '../components/ChatInput.vue';
import AgentActivityPanel from '../components/AgentActivityPanel.vue';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const messagesContainer = ref<HTMLElement | null>(null);
const sending = ref(false);

const projectId = route.params.id as string;

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

async function handleSend(content: string) {
  sending.value = true;
  try {
    await projectStore.sendMessage(projectId, content);
  } finally {
    sending.value = false;
  }
}

async function handleFollowup(content: string) {
  sending.value = true;
  try {
    await projectStore.requestFollowup(projectId, content);
  } finally {
    sending.value = false;
  }
}

watch(() => projectStore.messages.length, () => {
  scrollToBottom();
});

onMounted(() => {
  projectStore.fetchProject(projectId);
  projectStore.subscribeToProject(projectId);
  projectStore.subscribeToMessages(projectId);
  scrollToBottom();
});

onUnmounted(() => {
  projectStore.unsubscribeMessages();
  projectStore.unsubscribeProject();
  projectStore.unsubscribeRun();
});

const agentRunning = computed(() => {
  const status = projectStore.currentProject?.status;
  return ['planning', 'pricing', 'synthesizing'].includes(status ?? '');
});

const chatDisabled = computed(() => agentRunning.value);

const chatMode = computed<'clarify' | 'followup' | 'waiting'>(() => {
  const status = projectStore.currentProject?.status;
  if (status === 'complete') return 'followup';
  if (agentRunning.value) return 'waiting';
  return 'clarify';
});

function handleAnySend(content: string) {
  if (chatMode.value === 'followup') handleFollowup(content);
  else handleSend(content);
}

const placeholder = computed(() => {
  if (chatMode.value === 'followup') return 'Ask a follow-up, e.g. "what if I use quartz instead?"';
  if (chatMode.value === 'waiting') return 'Agent is working — hang tight.';
  return 'Describe your project or answer the question...';
});

const disabledNotice = computed(() => {
  if (chatMode.value === 'waiting') return 'Agent is working — new messages will be available once it finishes.';
  return undefined;
});

function openFull() {
  const runId = projectStore.currentRun?.id ?? projectStore.currentProject?.currentAgentRunId;
  if (runId) router.push(`/project/${projectId}/run/${runId}`);
}
</script>

<template>
  <div class="conversation">
    <div class="conversation-header">
      <button class="back-btn" @click="router.push('/')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </button>
      <div class="header-center">
        <h1>{{ projectStore.currentProject?.title ?? 'Conversation' }}</h1>
        <span v-if="projectStore.currentProject" class="status-badge" :class="projectStore.currentProject.status">
          <span class="status-dot"></span>
          {{ projectStore.currentProject.status }}
        </span>
      </div>
      <div class="header-spacer"></div>
    </div>

    <div v-if="agentRunning" class="agent-running-banner">
      <AgentActivityPanel
        :run="projectStore.currentRun"
        :steps="projectStore.runSteps"
        @open-full="openFull"
      />
    </div>

    <div v-if="projectStore.currentProject?.status === 'complete'" class="report-banner" @click="router.push(`/project/${projectId}/report`)">
      <span class="rb-stamp">SHEET 01<br>READY</span>
      <div class="rb-body">
        <div class="rb-eyebrow">YOUR PROJECT BLUEPRINT</div>
        <div class="rb-title">Sourced. Priced. Drafted.</div>
        <div class="rb-sub">Materials cart, labor estimate, ordered task list, code warnings, tutorial videos.</div>
      </div>
      <button class="rb-btn">
        Open blueprint
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </div>

    <div ref="messagesContainer" class="messages">
      <div class="messages-bg"></div>
      <div v-if="projectStore.messages.length === 0 && !projectStore.loading" class="empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Waiting for messages...</span>
      </div>
      <ChatMessage
        v-for="msg in projectStore.messages"
        :key="msg.id"
        :message="msg"
      />
      <div v-if="sending" class="typing-indicator">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
        <span class="typing-text">Handy is thinking...</span>
      </div>
    </div>

    <ChatInput
      :loading="sending"
      :disabled="chatDisabled"
      :placeholder="placeholder"
      :disabled-notice="disabledNotice"
      @send="handleAnySend"
    />
  </div>
</template>

<style scoped>
.conversation {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  max-width: 840px;
  margin: 0 auto;
  width: 100%;
}
.conversation-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-card);
}
.back-btn {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}
.back-btn:hover { background: var(--bg-surface); color: var(--text-primary); }
.header-center {
  flex: 1; display: flex; align-items: center; gap: 0.75rem; min-width: 0;
}
.header-center h1 {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.header-spacer { width: 70px; }

.status-badge {
  display: flex; align-items: center; gap: 0.3rem;
  padding: 0.2rem 0.55rem; border-radius: 999px;
  font-family: var(--font-heading);
  font-size: 0.68rem; font-weight: 600;
  text-transform: capitalize; letter-spacing: 0.03em;
  flex-shrink: 0;
}
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.status-badge.clarifying { background: var(--primary-light); color: var(--primary); }
.status-badge.clarifying .status-dot { background: var(--primary); }
.status-badge.planning,
.status-badge.pricing,
.status-badge.synthesizing {
  background: var(--warning-light); color: var(--warning);
}
.status-badge.planning .status-dot,
.status-badge.pricing .status-dot,
.status-badge.synthesizing .status-dot {
  background: var(--warning);
  animation: blink 1s ease-in-out infinite;
}
.status-badge.complete { background: var(--success-light); color: var(--success); }
.status-badge.complete .status-dot { background: var(--success); }
.status-badge.error { background: var(--danger-light); color: var(--danger); }
.status-badge.error .status-dot { background: var(--danger); }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

.agent-running-banner {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-surface);
}

.report-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem 0.75rem 0.65rem;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-light);
  border-left: 4px solid var(--primary);
  cursor: pointer;
  transition: all 0.18s var(--ease-out);
  animation: bannerIn 0.5s var(--ease-out);
}
.report-banner:hover {
  background: var(--primary-light);
  border-left-color: var(--primary-hover);
}
@keyframes bannerIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.rb-stamp {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  padding: 0.4rem 0.3rem;
  border: 2px solid var(--primary);
  border-radius: 4px;
  background: var(--bg-card);
  background-image: var(--hatch-pattern);
  background-blend-mode: multiply;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--primary);
  text-align: center;
  line-height: 1.15;
  transform: rotate(-3deg);
}
.rb-body {
  flex: 1;
  min-width: 0;
}
.rb-eyebrow {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--primary);
  margin-bottom: 0.15rem;
}
.rb-title {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 1.15rem;
  color: var(--text-primary);
  line-height: 1.1;
  margin-bottom: 0.15rem;
}
.rb-sub {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  line-height: 1.35;
}
.rb-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1rem;
  background: var(--primary);
  color: white;
  border: 1px solid var(--primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.18s var(--ease-out);
  box-shadow: 0 1px 0 var(--primary-hover) inset;
}
.rb-btn:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  transform: translateX(2px);
}

.messages {
  flex: 1; overflow-y: auto; padding: 1.25rem;
  display: flex; flex-direction: column; gap: 1rem;
  position: relative; background: var(--bg-surface);
}
.messages-bg {
  position: fixed; inset: 0;
  background-image: var(--grid-pattern);
  background-size: 40px 40px;
  opacity: 0.3; pointer-events: none; z-index: 0;
}
.messages > *:not(.messages-bg) { position: relative; z-index: 1; }

.empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.75rem; text-align: center;
  color: var(--text-tertiary);
  padding: 3rem; font-size: 0.9rem;
}

.typing-indicator {
  display: flex; align-items: center; gap: 0.65rem;
  padding: 0.5rem 0;
}
.typing-dots { display: flex; gap: 4px; }
.typing-dots span {
  width: 7px; height: 7px;
  background: var(--primary-muted);
  border-radius: 50%;
  animation: dotBounce 1.2s ease-in-out infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes dotBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}
.typing-text {
  font-family: var(--font-heading);
  font-size: 0.8rem; color: var(--text-tertiary); font-weight: 500;
}
</style>
