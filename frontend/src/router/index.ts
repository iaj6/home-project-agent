import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LandingView from '../views/LandingView.vue';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import NewProjectView from '../views/NewProjectView.vue';
import ConversationView from '../views/ConversationView.vue';
import ReportView from '../views/ReportView.vue';
import AgentActivityView from '../views/AgentActivityView.vue';

const routes = [
  { path: '/', name: 'landing', component: LandingView },
  { path: '/sample', name: 'sample', component: ReportView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/dashboard', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
  { path: '/new', name: 'new-project', component: NewProjectView, meta: { requiresAuth: true } },
  { path: '/project/:id', name: 'conversation', component: ConversationView, meta: { requiresAuth: true } },
  { path: '/project/:id/report', name: 'report', component: ReportView, meta: { requiresAuth: true } },
  { path: '/project/:id/run/:runId', name: 'agent-activity', component: AgentActivityView, meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.user && !authStore.loading) {
    return { name: 'login' };
  }
});

export default router;
