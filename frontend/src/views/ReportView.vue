<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import ScoreGauge from '../components/ScoreGauge.vue';
import TaskList from '../components/TaskList.vue';
import MaterialsCart from '../components/MaterialsCart.vue';
import LaborEstimate from '../components/LaborEstimate.vue';
import TradeoffCard from '../components/TradeoffCard.vue';
import ConfidenceBadge from '../components/ConfidenceBadge.vue';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();

const projectId = route.params.id as string;

onMounted(() => {
  projectStore.fetchProject(projectId);
  projectStore.subscribeToProject(projectId);
});

onUnmounted(() => {
  projectStore.unsubscribeProject();
});

function currency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

const hasReport = computed(() => !!projectStore.currentReport);
const report = computed(() => projectStore.currentReport);

const videoResources = computed(() =>
  (report.value?.resources ?? []).filter((r) => r.type === 'video' && r.videoId),
);
const articleResources = computed(() =>
  (report.value?.resources ?? []).filter((r) => r.type !== 'video' || !r.videoId),
);

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K views`;
  return `${n} views`;
}
</script>

<template>
  <div class="report">
    <div class="report-header">
      <button class="back-btn" @click="router.push(`/project/${projectId}`)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Conversation
      </button>
      <div class="report-title-row">
        <div class="report-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div class="title-meta">
          <h1>{{ projectStore.currentProject?.title }}</h1>
          <p class="report-subtitle">Project Blueprint</p>
        </div>
        <div class="header-actions">
          <button
            v-if="projectStore.currentProject?.currentAgentRunId"
            class="trace-btn"
            @click="router.push(`/project/${projectId}/run/${projectStore.currentProject?.currentAgentRunId}`)"
          >
            Show work
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="projectStore.loading" class="loading">
      <div class="loading-pulse"></div>
      <span>Loading report…</span>
    </div>

    <template v-else-if="hasReport && report">
      <section class="section hero-section">
        <div class="hero-grid">
          <div class="hero-summary">
            <p class="summary-text">{{ report.summary }}</p>
            <div class="hero-meta">
              <span class="chip">⏱ {{ report.estimatedDuration }}</span>
              <span class="chip">ZIP {{ report.materials.zipCode }}</span>
              <ConfidenceBadge :level="report.confidence.overall" label="Overall" />
            </div>
          </div>
          <div class="hero-totals">
            <div class="total">
              <span class="total-label">DIY (materials)</span>
              <span class="total-val">{{ currency(report.costSummary.diyTotal) }}</span>
            </div>
            <div class="total">
              <span class="total-label">Pro total</span>
              <span class="total-val">{{ currency(report.costSummary.proTotal) }}</span>
            </div>
            <div class="savings">
              <span class="save-label">You save ~{{ report.costSummary.savingsPercent }}%</span>
              <span class="save-val">{{ currency(report.costSummary.savings) }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-label">Assessment</div>
        <div class="scores-row">
          <ScoreGauge :score="report.complexityScore" label="Complexity" />
          <ScoreGauge :score="report.diyFeasibilityScore" label="DIY Feasibility" />
        </div>
      </section>

      <section class="section">
        <div class="section-label">Materials</div>
        <MaterialsCart :materials="report.materials" />
      </section>

      <section class="section">
        <div class="section-label">Labor</div>
        <LaborEstimate :labor="report.labor" />
      </section>

      <section v-if="report.tradeoffs" class="section">
        <div class="section-label">Quality · Time · Money</div>
        <TradeoffCard :tradeoffs="report.tradeoffs" />
      </section>

      <section class="section">
        <div class="section-label">Tasks</div>
        <div class="card-section">
          <TaskList :tasks="report.tasks" />
        </div>
      </section>

      <section v-if="report.resources.length" class="section">
        <div class="section-label">Resources</div>
        <div class="card-section">
          <div v-if="videoResources.length" class="video-grid">
            <a
              v-for="(resource, idx) in videoResources"
              :key="`v-${idx}`"
              :href="resource.url"
              target="_blank"
              rel="noopener noreferrer"
              class="video-card"
            >
              <div class="video-thumb-wrap">
                <img :src="resource.thumbnail" :alt="resource.title" class="video-thumb" />
                <div class="video-play">▶</div>
              </div>
              <div class="video-meta">
                <div class="video-title">{{ resource.title }}</div>
                <div class="video-sub">
                  <span v-if="resource.source">{{ resource.source }}</span>
                  <span v-if="resource.viewCount">· {{ formatViews(resource.viewCount) }}</span>
                </div>
              </div>
            </a>
          </div>
          <ul v-if="articleResources.length" class="resources-list">
            <li v-for="(resource, idx) in articleResources" :key="`a-${idx}`">
              <a :href="resource.url" target="_blank" rel="noopener noreferrer">{{ resource.title }}</a>
              <span class="resource-type">{{ resource.type }}</span>
            </li>
          </ul>
        </div>
      </section>

      <section v-if="report.warnings.length" class="section">
        <div class="section-label warning-label">Warnings</div>
        <div v-for="(warning, idx) in report.warnings" :key="idx" class="alert alert-warning">
          {{ warning }}
        </div>
      </section>

      <section v-if="report.tips.length" class="section">
        <div class="section-label tip-label">Pro Tips</div>
        <div v-for="(tip, idx) in report.tips" :key="idx" class="alert alert-tip">
          {{ tip }}
        </div>
      </section>

      <section v-if="report.confidence.caveats.length" class="section">
        <div class="section-label">Confidence Caveats</div>
        <div class="card-section">
          <ul class="caveats">
            <li v-for="(caveat, idx) in report.confidence.caveats" :key="idx">{{ caveat }}</li>
          </ul>
        </div>
      </section>
    </template>

    <div v-else class="empty">
      Report not yet available.
      <p v-if="projectStore.currentProject?.status && ['planning', 'pricing', 'synthesizing'].includes(projectStore.currentProject.status)">
        The agent is working on it — status: <strong>{{ projectStore.currentProject.status }}</strong>.
      </p>
    </div>
  </div>
</template>

<style scoped>
.report {
  max-width: 940px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

.report-header {
  margin-bottom: 2rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  margin-bottom: 1.25rem;
}
.back-btn:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.report-title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.report-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: white;
  border-radius: var(--radius-md);
  flex-shrink: 0;
}
.title-meta {
  flex: 1;
  min-width: 0;
}
.title-meta h1 {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
}
.report-subtitle {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  color: var(--text-tertiary);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.header-actions {
  display: flex;
  gap: 0.5rem;
}
.trace-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.45rem 0.8rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}
.trace-btn:hover {
  background: var(--primary-light);
  color: var(--primary-hover);
  border-color: var(--primary-muted);
}

/* Sections */
.section {
  margin-bottom: 2rem;
  animation: sectionIn 0.4s var(--ease-out) both;
}
@keyframes sectionIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.section-label {
  font-family: var(--font-heading);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-light);
}
.section-label.warning-label { color: var(--warning); border-bottom-color: var(--warning-light); }
.section-label.tip-label { color: var(--accent); border-bottom-color: var(--accent-light); }

.card-section {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 0.5rem 0.85rem;
}

/* Hero section */
.hero-section {
  background: var(--bg-dark);
  color: var(--text-inverse);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  background-image: var(--grid-pattern);
  background-size: 20px 20px;
  background-blend-mode: soft-light;
}
.hero-section .section-label { display: none; }
.hero-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1.5rem;
}
.hero-summary .summary-text {
  font-family: var(--font-display);
  font-size: 1.2rem;
  line-height: 1.45;
  color: var(--text-inverse);
  margin-bottom: 0.9rem;
}
.hero-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.hero-meta .chip {
  padding: 0.2rem 0.55rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  font-family: var(--font-heading);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-inverse);
}
.hero-totals {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.total-label {
  font-family: var(--font-heading);
  font-size: 0.78rem;
  color: var(--primary-muted);
  font-weight: 600;
  letter-spacing: 0.04em;
}
.total-val {
  font-family: var(--font-heading);
  font-size: 1.15rem;
  font-weight: 700;
}
.savings {
  margin-top: 0.25rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.save-label {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: 600;
  color: #E7C99B;
}
.save-val {
  font-family: var(--font-heading);
  font-size: 1.25rem;
  font-weight: 800;
  color: #E7C99B;
}

.scores-row {
  display: flex;
  gap: 1.25rem;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.85rem;
  margin-bottom: 0.85rem;
}
.video-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-card);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.video-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}
.video-thumb-wrap {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--bg-surface);
}
.video-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.video-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  opacity: 0.85;
  pointer-events: none;
}
.video-meta {
  padding: 0.55rem 0.7rem 0.65rem;
}
.video-title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.85rem;
  line-height: 1.3;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.video-sub {
  margin-top: 0.3rem;
  font-size: 0.72rem;
  color: var(--text-tertiary);
  display: flex;
  gap: 0.35rem;
}
.resources-list { list-style: none; padding: 0; }
.resources-list li {
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.resources-list li:last-child { border-bottom: none; }
.resources-list a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}
.resources-list a:hover { text-decoration: underline; color: var(--primary-hover); }
.resource-type {
  font-family: var(--font-heading);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  background: var(--bg-surface);
  border-radius: 999px;
  color: var(--text-tertiary);
  text-transform: capitalize;
  letter-spacing: 0.04em;
}

.alert {
  padding: 0.85rem 1.1rem;
  border-radius: var(--radius-md);
  margin-bottom: 0.65rem;
  font-size: 0.9rem;
  line-height: 1.5;
  border-left: 4px solid;
}
.alert-warning { background: var(--warning-light); color: #7C4A0E; border-left-color: var(--warning); }
.alert-tip { background: var(--accent-light); color: var(--accent); border-left-color: var(--accent); }

.caveats { list-style: disc; padding-left: 1.25rem; }
.caveats li {
  font-size: 0.85rem;
  padding: 0.25rem 0;
  color: var(--text-secondary);
}

.loading {
  display: flex; flex-direction: column; align-items: center;
  gap: 1rem; padding: 4rem; color: var(--text-tertiary);
  font-family: var(--font-heading); font-size: 0.9rem;
}
.loading-pulse {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--primary-light);
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(0.85); opacity: 0.5; }
  50% { transform: scale(1.15); opacity: 1; }
}

.empty {
  text-align: center; color: var(--text-tertiary); padding: 4rem;
  font-family: var(--font-heading); font-size: 0.95rem;
}
.empty p { margin-top: 0.75rem; }

@media (max-width: 700px) {
  .hero-grid { grid-template-columns: 1fr; }
  .scores-row { flex-direction: column; }
}
</style>
