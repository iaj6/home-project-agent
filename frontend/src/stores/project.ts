import { defineStore } from 'pinia';
import { ref } from 'vue';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { functions, db, auth } from '../lib/firebase';
import type {
  AgentRun,
  AgentStep,
  ConversationMessage,
  Project,
  ProjectReport,
  StartProjectInput,
} from '@home-advisor/shared';

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in (v as Record<string, unknown>)) {
    const maybe = (v as { toDate?: () => Date }).toDate;
    if (typeof maybe === 'function') return maybe.call(v);
  }
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date();
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([]);
  const currentProject = ref<Project | null>(null);
  const messages = ref<ConversationMessage[]>([]);
  const currentReport = ref<ProjectReport | null>(null);
  const currentRun = ref<AgentRun | null>(null);
  const runSteps = ref<AgentStep[]>([]);
  const loading = ref(false);

  let messagesUnsubscribe: Unsubscribe | null = null;
  let projectUnsubscribe: Unsubscribe | null = null;
  let runUnsubscribe: Unsubscribe | null = null;
  let stepsUnsubscribe: Unsubscribe | null = null;
  let reportUnsubscribe: Unsubscribe | null = null;

  async function fetchProjects() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    loading.value = true;
    const q = query(
      collection(db, 'projects'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
    );
    onSnapshot(q, (snapshot) => {
      projects.value = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...(data as Project),
          id: d.id,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        } as Project;
      });
      loading.value = false;
    });
  }

  async function startProject(input: StartProjectInput): Promise<string> {
    loading.value = true;
    try {
      const fn = httpsCallable<StartProjectInput, { projectId: string }>(functions, 'startProject');
      const result = await fn(input);
      return result.data.projectId;
    } finally {
      loading.value = false;
    }
  }

  async function sendMessage(projectId: string, content: string) {
    loading.value = true;
    try {
      const fn = httpsCallable(functions, 'sendMessage');
      await fn({ projectId, message: content });
    } finally {
      loading.value = false;
    }
  }

  async function requestFollowup(projectId: string, question: string): Promise<string> {
    const fn = httpsCallable<
      { projectId: string; question: string },
      { runId: string }
    >(functions, 'requestFollowup');
    const result = await fn({ projectId, question });
    return result.data.runId;
  }

  async function retryProject(projectId: string): Promise<string> {
    const fn = httpsCallable<{ projectId: string }, { runId: string }>(
      functions,
      'retryProject',
    );
    const result = await fn({ projectId });
    return result.data.runId;
  }

  async function fetchProject(projectId: string) {
    loading.value = true;
    try {
      const fn = httpsCallable<
        { projectId: string },
        { project: Project; report?: ProjectReport | null; currentRun?: AgentRun | null }
      >(functions, 'getProject');
      const result = await fn({ projectId });
      const p = result.data.project;
      currentProject.value = {
        ...p,
        createdAt: toDate(p.createdAt),
        updatedAt: toDate(p.updatedAt),
      };
      if (result.data.report) {
        const r = result.data.report;
        currentReport.value = {
          ...r,
          generatedAt: toDate(r.generatedAt),
        };
      } else {
        currentReport.value = null;
      }
      if (result.data.currentRun) {
        currentRun.value = {
          ...result.data.currentRun,
          startedAt: toDate(result.data.currentRun.startedAt),
          completedAt: result.data.currentRun.completedAt
            ? toDate(result.data.currentRun.completedAt)
            : undefined,
        };
      } else {
        currentRun.value = null;
      }
    } finally {
      loading.value = false;
    }
  }

  function subscribeToProject(projectId: string) {
    unsubscribeProject();
    projectUnsubscribe = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      currentProject.value = {
        ...(data as Project),
        id: snap.id,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as Project;
      const runId = (data as Project).currentAgentRunId;
      if (runId && (!currentRun.value || currentRun.value.id !== runId)) {
        subscribeToRun(runId);
      }
    });

    reportUnsubscribe = onSnapshot(
      doc(db, 'projects', projectId, 'report', 'main'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          currentReport.value = {
            ...(data as ProjectReport),
            generatedAt: toDate(data.generatedAt),
          };
        } else {
          currentReport.value = null;
        }
      },
    );
  }

  function subscribeToRun(runId: string) {
    unsubscribeRun();
    runUnsubscribe = onSnapshot(doc(db, 'agentRuns', runId), (snap) => {
      if (!snap.exists()) {
        currentRun.value = null;
        return;
      }
      const data = snap.data();
      currentRun.value = {
        ...(data as AgentRun),
        id: snap.id,
        startedAt: toDate(data.startedAt),
        completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
      } as AgentRun;
    });

    const stepsQ = query(
      collection(db, 'agentRuns', runId, 'steps'),
      orderBy('index', 'asc'),
    );
    stepsUnsubscribe = onSnapshot(stepsQ, (snap) => {
      runSteps.value = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...(data as AgentStep),
          id: d.id,
          startedAt: toDate(data.startedAt),
        } as AgentStep;
      });
    });
  }

  function subscribeToMessages(projectId: string) {
    if (messagesUnsubscribe) messagesUnsubscribe();
    const q = query(
      collection(db, 'projects', projectId, 'messages'),
      orderBy('createdAt', 'asc'),
    );
    messagesUnsubscribe = onSnapshot(q, (snapshot) => {
      messages.value = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...(data as ConversationMessage),
          id: d.id,
          createdAt: toDate(data.createdAt),
        } as ConversationMessage;
      });
    });
  }

  function unsubscribeMessages() {
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
      messagesUnsubscribe = null;
    }
  }

  function unsubscribeProject() {
    if (projectUnsubscribe) {
      projectUnsubscribe();
      projectUnsubscribe = null;
    }
    if (reportUnsubscribe) {
      reportUnsubscribe();
      reportUnsubscribe = null;
    }
  }

  function unsubscribeRun() {
    if (runUnsubscribe) {
      runUnsubscribe();
      runUnsubscribe = null;
    }
    if (stepsUnsubscribe) {
      stepsUnsubscribe();
      stepsUnsubscribe = null;
    }
    runSteps.value = [];
  }

  function unsubscribeAll() {
    unsubscribeMessages();
    unsubscribeProject();
    unsubscribeRun();
  }

  return {
    projects,
    currentProject,
    messages,
    currentReport,
    currentRun,
    runSteps,
    loading,
    fetchProjects,
    startProject,
    sendMessage,
    requestFollowup,
    retryProject,
    fetchProject,
    subscribeToMessages,
    subscribeToProject,
    subscribeToRun,
    unsubscribeMessages,
    unsubscribeProject,
    unsubscribeRun,
    unsubscribeAll,
  };
});
