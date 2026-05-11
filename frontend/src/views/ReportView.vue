<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import ScoreGauge from '../components/ScoreGauge.vue';
import TaskList from '../components/TaskList.vue';
import MaterialsCart from '../components/MaterialsCart.vue';
import LaborEstimate from '../components/LaborEstimate.vue';
import TradeoffCard from '../components/TradeoffCard.vue';
import ConfidenceBadge from '../components/ConfidenceBadge.vue';
import { SAMPLE_PROJECT, SAMPLE_REPORT } from '../data/sample-report';
import { renderInline } from '../lib/markdown';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();

const isSample = computed(() => route.name === 'sample');
const projectId = computed(() =>
  isSample.value ? SAMPLE_PROJECT.id : (route.params.id as string),
);

onMounted(() => {
  if (isSample.value) return;
  projectStore.fetchProject(projectId.value);
  projectStore.subscribeToProject(projectId.value);
});

onUnmounted(() => {
  if (isSample.value) return;
  projectStore.unsubscribeProject();
});

const project = computed(() =>
  isSample.value ? SAMPLE_PROJECT : projectStore.currentProject,
);
const report = computed(() =>
  isSample.value ? SAMPLE_REPORT : projectStore.currentReport,
);
const hasReport = computed(() => !!report.value);

const videoResources = computed(() =>
  (report.value?.resources ?? []).filter((r) => r.type === 'video' && r.videoId),
);
const articleResources = computed(() =>
  (report.value?.resources ?? []).filter((r) => r.type !== 'video' || !r.videoId),
);

function currency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K views`;
  return `${n} views`;
}

// Drawing-number stamp: stable short identifier from the project ID.
// Real blueprints have things like "DWG-2024-0142"; we mint our own.
const drawingNumber = computed(() => {
  const id = project.value?.id ?? 'DRAFT';
  const slice = id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase().padStart(4, '0');
  return `HHA-${slice}`;
});

const generatedAt = computed(() => {
  const d = report.value?.generatedAt;
  if (!d) return null;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(d instanceof Date ? d : new Date(d as unknown as string | number | Date));
});

// Visible sections, in order, for the sticky section navigator.
// Filtered at render time based on what's actually present.
const sectionList = computed(() => {
  const r = report.value;
  if (!r) return [];
  return [
    { id: 'assessment', num: '01', label: 'Assessment', show: true },
    { id: 'materials', num: '02', label: 'Materials', show: true },
    { id: 'labor', num: '03', label: 'Labor', show: true },
    { id: 'tradeoffs', num: '04', label: 'Tradeoffs', show: !!r.tradeoffs },
    { id: 'tasks', num: '05', label: 'Tasks', show: true },
    { id: 'resources', num: '06', label: 'Resources', show: r.resources.length > 0 },
    { id: 'warnings', num: '07', label: 'Warnings', show: r.warnings.length > 0 },
    { id: 'tips', num: '08', label: 'Pro Tips', show: r.tips.length > 0 },
    { id: 'caveats', num: '09', label: 'Caveats', show: r.confidence.caveats.length > 0 },
  ].filter((s) => s.show);
});

// Track which section the user is currently on, for the sticky nav highlight.
const activeSection = ref<string>('assessment');
let observer: IntersectionObserver | null = null;
onMounted(() => {
  // Wait for the DOM to render the sections before wiring up scroll-spy.
  requestAnimationFrame(() => {
    observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top that's currently in view.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) activeSection.value = visible[0].target.id;
      },
      { rootMargin: '-100px 0px -55% 0px' },
    );
    document.querySelectorAll('section[id]').forEach((el) => observer?.observe(el));
  });
});
onUnmounted(() => observer?.disconnect());

function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div class="report-page">
    <!-- ───────── Sample banner (only on /sample) ───────── -->
    <div v-if="isSample" class="sample-banner">
      <span class="sb-stamp">SAMPLE</span>
      <span class="sb-text"><strong>This is what a finished plan looks like.</strong> A real run pulls live HD prices and ZIP-specific labor.</span>
      <button class="sb-cta" @click="router.push('/new')">Make your own →</button>
    </div>

    <button class="back-btn" @click="router.push(isSample ? '/' : `/project/${projectId}`)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      {{ isSample ? 'Back to Home' : 'Back to Conversation' }}
    </button>

    <!-- ───────── Loading / empty ───────── -->
    <div v-if="!isSample && projectStore.loading && !hasReport" class="loading">
      <div class="loading-pulse"></div>
      <span>Loading report…</span>
    </div>

    <template v-else-if="hasReport && report">
      <!-- ═════════════════ TITLE BLOCK ═════════════════ -->
      <header class="title-block">
        <!-- Decorative corner brackets, like architectural drawings. -->
        <span class="tb-corner tl"></span>
        <span class="tb-corner tr"></span>
        <span class="tb-corner bl"></span>
        <span class="tb-corner br"></span>

        <!-- Top strip: drawing metadata, drafting-style. -->
        <div class="tb-strip">
          <span class="tb-meta">
            <span class="meta-k">DWG</span>
            <span class="meta-v">{{ drawingNumber }}</span>
          </span>
          <span class="tb-meta">
            <span class="meta-k">SHEET</span>
            <span class="meta-v">01 / FINAL</span>
          </span>
          <span class="tb-meta">
            <span class="meta-k">DATE</span>
            <span class="meta-v">{{ generatedAt ?? '—' }}</span>
          </span>
          <span class="tb-meta tb-meta-zip">
            <span class="meta-k">ZIP</span>
            <span class="meta-v">{{ report.materials.zipCode }}</span>
          </span>
        </div>

        <!-- Main body: identity + cost panel -->
        <div class="tb-body">
          <div class="tb-identity">
            <div class="tb-eyebrow">PROJECT BLUEPRINT</div>
            <h1 class="tb-title">{{ project?.title }}</h1>
            <p class="tb-summary" v-html="renderInline(report.summary)"></p>
            <div class="tb-tags">
              <span class="tb-tag">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ report.estimatedDuration }}
              </span>
              <ConfidenceBadge :level="report.confidence.overall" label="Overall" />
            </div>
          </div>

          <div class="tb-costs">
            <div class="tb-cost-header">
              <span class="cost-mark">EST.</span>
              <span class="cost-h">Investment</span>
            </div>
            <div class="tb-cost-grid">
              <div class="cost-row">
                <span class="cost-label">DIY · materials only</span>
                <span class="cost-val">{{ currency(report.costSummary.diyTotal) }}</span>
              </div>
              <div class="cost-row">
                <span class="cost-label">Pro · turnkey</span>
                <span class="cost-val">{{ currency(report.costSummary.proTotal) }}</span>
              </div>
            </div>
            <div class="tb-savings">
              <div class="sv-meta">
                <span class="sv-label">EST. SAVINGS @ DIY</span>
                <span class="sv-pct">~{{ report.costSummary.savingsPercent }}%</span>
              </div>
              <span class="sv-val">{{ currency(report.costSummary.savings) }}</span>
            </div>
          </div>
        </div>

        <!-- Signature strip: the "drafted by" line. -->
        <div class="tb-sig">
          <div class="sig-line">
            <span class="sig-label">Drafted by</span>
            <span class="sig-name">Handy</span>
            <span class="sig-suffix">·  Home Helper agentic planner</span>
          </div>
          <button
            v-if="project?.currentAgentRunId"
            class="sig-trace"
            @click="router.push(`/project/${projectId}/run/${project?.currentAgentRunId}`)"
          >
            View agent trace
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- ═════════════════ STICKY SECTION NAVIGATOR ═════════════════ -->
      <nav class="report-nav" aria-label="Report sections">
        <ul>
          <li
            v-for="sec in sectionList"
            :key="sec.id"
            :class="{ active: activeSection === sec.id }"
          >
            <a :href="`#${sec.id}`" @click.prevent="jumpTo(sec.id)">
              <span class="nv-num">§{{ sec.num }}</span>
              <span class="nv-label">{{ sec.label }}</span>
            </a>
          </li>
        </ul>
      </nav>

      <!-- ═════════════════ SECTIONS ═════════════════ -->
      <section id="assessment" class="section">
        <header class="section-mark">
          <span class="mk-num">§01</span>
          <span class="mk-title">Assessment</span>
          <span class="mk-rule"></span>
          <span class="mk-tag">SCORED 1–10</span>
        </header>
        <div class="scores-row">
          <ScoreGauge :score="report.complexityScore" label="Complexity" />
          <ScoreGauge :score="report.diyFeasibilityScore" label="DIY Feasibility" />
        </div>
      </section>

      <section id="materials" class="section">
        <header class="section-mark">
          <span class="mk-num">§02</span>
          <span class="mk-title">Materials</span>
          <span class="mk-rule"></span>
          <span class="mk-tag">{{ report.materials.items.length }} ITEMS</span>
        </header>
        <MaterialsCart :materials="report.materials" />
      </section>

      <section id="labor" class="section">
        <header class="section-mark">
          <span class="mk-num">§03</span>
          <span class="mk-title">Labor</span>
          <span class="mk-rule"></span>
          <span class="mk-tag">{{ report.labor.sources.length }} SOURCES</span>
        </header>
        <LaborEstimate :labor="report.labor" />
      </section>

      <section v-if="report.tradeoffs" id="tradeoffs" class="section">
        <header class="section-mark">
          <span class="mk-num">§04</span>
          <span class="mk-title">Quality · Time · Money</span>
          <span class="mk-rule"></span>
          <span class="mk-tag">TRADEOFFS</span>
        </header>
        <TradeoffCard :tradeoffs="report.tradeoffs" />
      </section>

      <section id="tasks" class="section">
        <header class="section-mark">
          <span class="mk-num">§05</span>
          <span class="mk-title">Tasks</span>
          <span class="mk-rule"></span>
          <span class="mk-tag">{{ report.tasks.length }} STEPS</span>
        </header>
        <div class="card-section">
          <TaskList :tasks="report.tasks" />
        </div>
      </section>

      <section v-if="report.resources.length" id="resources" class="section">
        <header class="section-mark">
          <span class="mk-num">§06</span>
          <span class="mk-title">Resources</span>
          <span class="mk-rule"></span>
          <span class="mk-tag">VIDEOS &amp; GUIDES</span>
        </header>
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
              <div class="video-play">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <span v-if="resource.viewCount" class="video-views">{{ formatViews(resource.viewCount) }}</span>
            </div>
            <div class="video-meta">
              <div class="video-title">{{ resource.title }}</div>
              <div v-if="resource.source" class="video-channel">{{ resource.source }}</div>
            </div>
          </a>
        </div>
        <ul v-if="articleResources.length" class="resources-list">
          <li v-for="(resource, idx) in articleResources" :key="`a-${idx}`">
            <a :href="resource.url" target="_blank" rel="noopener noreferrer">
              <span class="rl-mark">↗</span>
              <span class="rl-title">{{ resource.title }}</span>
            </a>
            <span class="rl-type">{{ resource.type }}</span>
          </li>
        </ul>
      </section>

      <section v-if="report.warnings.length" id="warnings" class="section">
        <header class="section-mark warn">
          <span class="mk-num">§07</span>
          <span class="mk-title">Warnings</span>
          <span class="mk-rule"></span>
          <span class="mk-tag">SAFETY &amp; CODE</span>
        </header>
        <div v-for="(warning, idx) in report.warnings" :key="idx" class="alert alert-warning">
          <span class="alert-mark">!</span>
          <span v-html="renderInline(warning)"></span>
        </div>
      </section>

      <section v-if="report.tips.length" id="tips" class="section">
        <header class="section-mark accent">
          <span class="mk-num">§08</span>
          <span class="mk-title">Pro Tips</span>
          <span class="mk-rule"></span>
          <span class="mk-tag">FROM EXPERIENCE</span>
        </header>
        <div v-for="(tip, idx) in report.tips" :key="idx" class="alert alert-tip">
          <span class="alert-mark">★</span>
          <span v-html="renderInline(tip)"></span>
        </div>
      </section>

      <section v-if="report.confidence.caveats.length" id="caveats" class="section">
        <header class="section-mark">
          <span class="mk-num">§09</span>
          <span class="mk-title">Caveats</span>
          <span class="mk-rule"></span>
          <span class="mk-tag">WHAT WE'RE LESS SURE ABOUT</span>
        </header>
        <div class="card-section">
          <ul class="caveats">
            <li v-for="(caveat, idx) in report.confidence.caveats" :key="idx" v-html="renderInline(caveat)"></li>
          </ul>
        </div>
      </section>

      <!-- End-of-blueprint stamp. -->
      <footer class="report-end">
        <div class="end-stamp">
          <div class="es-line es-line-1">END OF</div>
          <div class="es-line es-line-2">BLUEPRINT</div>
          <div class="es-line es-line-3">{{ drawingNumber }}</div>
        </div>
        <p class="end-note">
          Estimates and recommendations are AI-generated from live retail and labor-guide
          data. Verify with your local building department and a licensed pro on the
          structural, electrical, and plumbing pieces. Handy's good but the inspector signs
          the permit.
        </p>
      </footer>
    </template>

    <div v-else class="empty">
      Report not yet available.
      <p v-if="project?.status && ['planning', 'pricing', 'synthesizing'].includes(project.status)">
        The agent is working on it — status: <strong>{{ project.status }}</strong>.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* ═════════════════ Page shell ═════════════════ */
.report-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 1.75rem 1.5rem 5rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  cursor: pointer;
  font-family: var(--font-heading);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  transition: all 0.18s var(--ease-out);
  margin-bottom: 1.25rem;
}
.back-btn:hover {
  background: var(--primary-light);
  color: var(--primary-hover);
  border-color: var(--primary-muted);
  transform: translateX(-2px);
}

/* ═════════════════ Sample banner ═════════════════ */
.sample-banner {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.6rem 0.8rem 0.6rem 0.65rem;
  margin-bottom: 1rem;
  background: var(--bg-card);
  border: 1px dashed var(--primary-muted);
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  color: var(--text-primary);
}
.sb-stamp {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  padding: 0.18rem 0.55rem;
  background: var(--primary);
  color: white;
  border-radius: 3px;
  flex-shrink: 0;
}
.sb-text { flex: 1; }
.sb-text strong { font-family: var(--font-heading); }
.sb-cta {
  padding: 0.4rem 0.85rem;
  border: 1px solid var(--primary);
  background: var(--primary);
  color: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.82rem;
  transition: background 0.15s;
}
.sb-cta:hover { background: var(--primary-hover); }

/* ═════════════════ TITLE BLOCK ═════════════════
 * Architectural-drawing title block, the centerpiece of the report.
 * Dark slate field with a subtle blueprint grid, framed with corner brackets,
 * top metadata strip, two-column body (identity + cost), bottom signature.
 */
.title-block {
  position: relative;
  background: var(--bg-dark);
  background-image: var(--grid-pattern-dark);
  background-size: 32px 32px;
  color: var(--text-inverse);
  border-radius: var(--radius-lg);
  padding: 1.65rem 1.85rem 1.4rem;
  margin-bottom: 2.5rem;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  isolation: isolate;
}
.title-block::before {
  /* Subtle vignette to give depth */
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 30% 0%, rgba(184, 92, 56, 0.10), transparent 60%);
  pointer-events: none;
  z-index: 0;
}
.tb-corner {
  position: absolute;
  width: 16px;
  height: 16px;
  z-index: 2;
}
.tb-corner.tl { top: 8px; left: 8px; border-top: 2px solid var(--primary-muted); border-left: 2px solid var(--primary-muted); }
.tb-corner.tr { top: 8px; right: 8px; border-top: 2px solid var(--primary-muted); border-right: 2px solid var(--primary-muted); }
.tb-corner.bl { bottom: 8px; left: 8px; border-bottom: 2px solid var(--primary-muted); border-left: 2px solid var(--primary-muted); }
.tb-corner.br { bottom: 8px; right: 8px; border-bottom: 2px solid var(--primary-muted); border-right: 2px solid var(--primary-muted); }

.tb-strip {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.2rem;
  padding-bottom: 1rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px dashed rgba(231, 201, 155, 0.25);
}
.tb-meta {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
}
.tb-meta .meta-k {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: rgba(231, 201, 155, 0.6);
  text-transform: uppercase;
}
.tb-meta .meta-v {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 600;
  color: #E7C99B;
  letter-spacing: 0.04em;
}
.tb-meta-zip { margin-left: auto; }

.tb-body {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.85rem;
  align-items: start;
}

.tb-identity { min-width: 0; }
.tb-eyebrow {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--primary-muted);
  margin-bottom: 0.55rem;
}
.tb-title {
  font-family: var(--font-heading);
  font-size: clamp(1.6rem, 3vw, 2.1rem);
  line-height: 1.1;
  font-weight: 800;
  color: var(--text-inverse);
  letter-spacing: -0.01em;
  margin-bottom: 0.7rem;
}
.tb-summary {
  font-family: var(--font-display);
  font-size: 1.02rem;
  line-height: 1.55;
  color: rgba(250, 246, 241, 0.85);
  margin-bottom: 1rem;
  font-style: italic;
}
.tb-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}
.tb-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  font-family: var(--font-heading);
  font-size: 0.74rem;
  font-weight: 500;
  color: var(--text-inverse);
}

/* Cost panel — looks like a stamped price tag */
.tb-costs {
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(231, 201, 155, 0.22);
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem 0.95rem;
  position: relative;
}
.tb-costs::before {
  /* Tiny crosshatch in the corner — like a stamped corner. */
  content: '';
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  background-image: var(--hatch-pattern);
  opacity: 0.55;
  border-radius: 2px;
}
.tb-cost-header {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-bottom: 0.7rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px dashed rgba(231, 201, 155, 0.22);
}
.cost-mark {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--primary-muted);
}
.cost-h {
  font-family: var(--font-heading);
  font-size: 0.84rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-inverse);
}
.tb-cost-grid {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 0.85rem;
}
.cost-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}
.cost-label {
  font-family: var(--font-heading);
  font-size: 0.78rem;
  color: rgba(250, 246, 241, 0.7);
  font-weight: 500;
}
.cost-val {
  font-family: var(--font-heading);
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--text-inverse);
  font-variant-numeric: tabular-nums;
}
.tb-savings {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 0.7rem;
  border-top: 2px solid rgba(231, 201, 155, 0.35);
}
.sv-meta { display: flex; flex-direction: column; gap: 0.15rem; }
.sv-label {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--primary-muted);
}
.sv-pct {
  font-family: var(--font-heading);
  font-size: 0.78rem;
  font-weight: 700;
  color: #E7C99B;
}
.sv-val {
  font-family: var(--font-heading);
  font-size: 1.55rem;
  font-weight: 800;
  color: #F5D9A8;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* Signature strip at the bottom */
.tb-sig {
  position: relative;
  z-index: 1;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px dashed rgba(231, 201, 155, 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.sig-line {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  font-family: var(--font-heading);
  font-size: 0.78rem;
}
.sig-label {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--primary-muted);
  text-transform: uppercase;
}
.sig-name {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-style: italic;
  font-weight: 400;
  color: #E7C99B;
  letter-spacing: 0.01em;
  /* underline that mimics a signed line */
  background-image: linear-gradient(to right, rgba(231, 201, 155, 0.5) 0, rgba(231, 201, 155, 0.5) 100%);
  background-position: 0 100%;
  background-repeat: no-repeat;
  background-size: 100% 1px;
  padding-bottom: 1px;
}
.sig-suffix {
  font-size: 0.74rem;
  color: rgba(231, 201, 155, 0.55);
  font-weight: 500;
}
.sig-trace {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  background: rgba(231, 201, 155, 0.08);
  border: 1px solid rgba(231, 201, 155, 0.25);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: #E7C99B;
  font-family: var(--font-heading);
  font-size: 0.78rem;
  font-weight: 600;
  transition: background 0.15s, color 0.15s;
}
.sig-trace:hover {
  background: rgba(231, 201, 155, 0.16);
  color: #F5D9A8;
}

/* ═════════════════ STICKY SECTION NAVIGATOR ═════════════════ */
.report-nav {
  position: sticky;
  top: 60px; /* below the AppHeader */
  z-index: 50;
  margin-bottom: 1.75rem;
  padding: 0.4rem;
  background: rgba(250, 246, 241, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.report-nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 0.15rem;
  overflow-x: auto;
  scrollbar-width: none;
}
.report-nav ul::-webkit-scrollbar { display: none; }
.report-nav li { flex: 0 0 auto; }
.report-nav a {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.7rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--text-tertiary);
  font-family: var(--font-heading);
  font-size: 0.78rem;
  font-weight: 600;
  transition: all 0.18s var(--ease-out);
  white-space: nowrap;
}
.report-nav a:hover {
  color: var(--text-primary);
  background: var(--bg-surface);
}
.report-nav li.active a {
  color: var(--primary-hover);
  background: var(--primary-light);
}
.nv-num {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--blueprint-ink);
  opacity: 0.8;
}
.report-nav li.active .nv-num { color: var(--primary); opacity: 1; }
.nv-label { letter-spacing: 0.02em; }

/* ═════════════════ Sections ═════════════════ */
.section {
  margin-bottom: 2.25rem;
  scroll-margin-top: 130px;
  animation: sectionIn 0.45s var(--ease-out) both;
}
@keyframes sectionIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Drafting-style section markers — numbered tag, title, dimension-line rule, side tag. */
.section-mark {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 1rem;
}
.mk-num {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.22rem 0.5rem;
  border: 1px solid var(--blueprint-ink);
  background: var(--blueprint-ink-soft);
  color: var(--blueprint-ink);
  border-radius: 3px;
  flex-shrink: 0;
}
.mk-title {
  font-family: var(--font-heading);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.01em;
  flex-shrink: 0;
}
.mk-rule {
  flex: 1;
  height: 1px;
  background: var(--border);
  position: relative;
  min-width: 20px;
}
/* Tick marks at each end — like a dimension line. */
.mk-rule::before,
.mk-rule::after {
  content: '';
  position: absolute;
  top: -3px;
  width: 1px;
  height: 7px;
  background: var(--border);
}
.mk-rule::before { left: 0; }
.mk-rule::after { right: 0; }
.mk-tag {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--text-tertiary);
  text-transform: uppercase;
  flex-shrink: 0;
}

.section-mark.warn .mk-num {
  border-color: var(--warning);
  background: var(--warning-light);
  color: var(--warning);
}
.section-mark.warn .mk-tag { color: var(--warning); }
.section-mark.accent .mk-num {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
}
.section-mark.accent .mk-tag { color: var(--accent); }

.card-section {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: 0.6rem 1rem;
}

.scores-row {
  display: flex;
  gap: 1.25rem;
}

/* ═════════════════ Resources ═════════════════ */
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
  transition: transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out);
}
.video-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-muted);
}
.video-thumb-wrap {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--bg-surface);
  overflow: hidden;
}
.video-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 280ms var(--ease-out);
}
.video-card:hover .video-thumb { transform: scale(1.04); }
.video-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0.9;
  pointer-events: none;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
}
.video-views {
  position: absolute;
  bottom: 6px;
  right: 6px;
  padding: 0.15rem 0.45rem;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-weight: 600;
  border-radius: 3px;
  letter-spacing: 0.02em;
}
.video-meta { padding: 0.6rem 0.7rem 0.7rem; }
.video-title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.86rem;
  line-height: 1.3;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0.3rem;
}
.video-channel {
  font-family: var(--font-heading);
  font-size: 0.72rem;
  color: var(--text-tertiary);
  font-weight: 500;
}

.resources-list {
  list-style: none;
  padding: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.resources-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.15s;
}
.resources-list li:last-child { border-bottom: none; }
.resources-list li:hover { background: var(--bg-surface); }
.resources-list a {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--primary-hover);
  text-decoration: none;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.9rem;
}
.rl-mark {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  background: var(--primary-light);
  border: 1px solid var(--primary-muted);
  border-radius: 4px;
  color: var(--primary-hover);
  font-size: 0.85rem;
  font-weight: 700;
}
.rl-title { line-height: 1.35; }
.rl-type {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 0.18rem 0.5rem;
  background: var(--bg-surface);
  border-radius: 3px;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

/* ═════════════════ Alerts (warnings + tips) ═════════════════ */
.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.85rem 1rem;
  border-radius: var(--radius-md);
  margin-bottom: 0.65rem;
  font-size: 0.92rem;
  line-height: 1.5;
  border-left: 4px solid;
}
.alert-warning {
  background: var(--warning-light);
  color: #6F4111;
  border-left-color: var(--warning);
}
.alert-tip {
  background: var(--accent-light);
  color: var(--accent);
  border-left-color: var(--accent);
}
.alert-mark {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-family: var(--font-heading);
  font-weight: 800;
  font-size: 0.85rem;
}
.alert-warning .alert-mark { background: var(--warning); color: white; }
.alert-tip .alert-mark { background: var(--accent); color: white; }

/* ═════════════════ Caveats ═════════════════ */
.caveats {
  list-style: none;
  padding: 0;
  margin: 0;
}
.caveats li {
  position: relative;
  font-size: 0.88rem;
  padding: 0.45rem 0 0.45rem 1.5rem;
  color: var(--text-secondary);
  border-bottom: 1px dashed var(--border-light);
  line-height: 1.5;
}
.caveats li:last-child { border-bottom: none; }
.caveats li::before {
  content: '⚐';
  position: absolute;
  left: 0;
  top: 0.45rem;
  color: var(--blueprint-ink);
  opacity: 0.55;
  font-size: 0.95rem;
}

/* ═════════════════ End-of-blueprint stamp ═════════════════ */
.report-end {
  margin-top: 3.5rem;
  padding: 2rem 0 0;
  border-top: 2px dashed var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
}
.end-stamp {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.4rem;
  border: 2px solid var(--primary);
  border-radius: 4px;
  background: var(--bg-card);
  background-image: var(--hatch-pattern);
  background-blend-mode: multiply;
  transform: rotate(-2.5deg);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-mono);
  color: var(--primary);
  letter-spacing: 0.18em;
  line-height: 1;
}
.es-line { display: block; }
.es-line-1, .es-line-2 {
  font-size: 0.95rem;
  font-weight: 800;
}
.es-line-2 { margin-top: 0.18rem; }
.es-line-3 {
  font-size: 0.7rem;
  margin-top: 0.45rem;
  opacity: 0.7;
  letter-spacing: 0.1em;
}
.end-note {
  max-width: 540px;
  font-size: 0.85rem;
  color: var(--text-tertiary);
  line-height: 1.55;
  font-style: italic;
}

/* ═════════════════ Loading / empty ═════════════════ */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem;
  color: var(--text-tertiary);
  font-family: var(--font-heading);
  font-size: 0.9rem;
}
.loading-pulse {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-light);
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(0.85); opacity: 0.5; }
  50%      { transform: scale(1.15); opacity: 1; }
}
.empty {
  text-align: center;
  color: var(--text-tertiary);
  padding: 4rem;
  font-family: var(--font-heading);
  font-size: 0.95rem;
}
.empty p { margin-top: 0.75rem; }

/* ═════════════════ Mobile ═════════════════ */
@media (max-width: 760px) {
  .report-page { padding: 1rem 0.85rem 4rem; }
  .title-block { padding: 1.1rem 1.1rem 1rem; }
  .tb-body { grid-template-columns: 1fr; gap: 1.25rem; }
  .tb-meta-zip { margin-left: 0; }
  .tb-strip { gap: 0.75rem; }
  .scores-row { flex-direction: column; }
  .section-mark { flex-wrap: wrap; }
  .mk-tag { display: none; }
  .report-nav { top: 0; }
  .sample-banner { flex-wrap: wrap; }
  .sb-text { flex-basis: 100%; order: 3; }
}
</style>
