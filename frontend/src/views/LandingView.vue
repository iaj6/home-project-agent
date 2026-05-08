<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useProjectStore } from '../stores/project';

const router = useRouter();
const authStore = useAuthStore();
const projectStore = useProjectStore();

const hasProjects = computed(() => projectStore.projects.length > 0);

function start() {
  router.push('/new');
}
function viewSample() {
  router.push('/sample');
}
function viewProjects() {
  router.push('/dashboard');
}
</script>

<template>
  <div class="landing">
    <section class="hero">
      <div class="hero-eyebrow">Project planning, with receipts</div>
      <h1 class="hero-title">
        Tell us about your home project.<br />
        Get a real plan, real prices, real sources.
      </h1>
      <p class="hero-sub">
        An AI agent describes your project, prices the materials at Home Depot near your ZIP,
        looks up regional labor cost ranges, and writes a sourced project blueprint with tasks,
        warnings, tradeoffs, and tutorial videos. About five minutes. Free.
      </p>
      <div class="hero-ctas">
        <button class="cta primary" :disabled="authStore.loading" @click="start">
          {{ authStore.loading ? 'Loading…' : 'Start a project' }}
        </button>
        <button class="cta secondary" @click="viewSample">See a sample report</button>
        <button v-if="hasProjects" class="cta ghost" @click="viewProjects">
          My projects ({{ projectStore.projects.length }})
        </button>
      </div>
      <p class="hero-foot">
        No signup, no email — your session is anonymous and lives in this browser.
      </p>
    </section>

    <section class="how">
      <h2 class="how-title">How it works</h2>
      <div class="how-grid">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-h">You describe</div>
          <p class="step-p">
            Pick a category, give a ZIP, write a sentence about what you want. The agent asks
            three or four follow-up questions to nail the spec.
          </p>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-h">Agent works</div>
          <p class="step-p">
            Watch the four-phase loop run live: plan → price (real Home Depot SKUs) → labor
            (HomeAdvisor &amp; Fixr cost guides) → synthesize. About five minutes.
          </p>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-h">You get a blueprint</div>
          <p class="step-p">
            Materials cart with prices &amp; links, labor cost range, ordered task list, code
            warnings, DIY tradeoffs, confidence scores, tutorial videos. All sourced.
          </p>
        </div>
      </div>
    </section>

    <section class="categories">
      <h2 class="cat-title">Categories supported today</h2>
      <div class="cat-row">
        <div class="cat-card">
          <span class="cat-icon">🚿</span>
          <span class="cat-name">Bathroom Vanity Replacement</span>
        </div>
        <div class="cat-card">
          <span class="cat-icon">🏗️</span>
          <span class="cat-name">Deck Building</span>
        </div>
        <div class="cat-card muted">
          <span class="cat-icon">+</span>
          <span class="cat-name">More to come</span>
        </div>
      </div>
    </section>

    <section class="footnote">
      <p>
        Built as a demonstration of agentic apps with live retail data. Source on
        <a href="https://github.com/" target="_blank" rel="noopener">GitHub</a>
        — the agent loop, structured outputs, and Crawlbase fetcher chain are the interesting
        parts.
      </p>
    </section>
  </div>
</template>

<style scoped>
.landing {
  max-width: 1040px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 6rem;
}

.hero {
  text-align: center;
  padding: 3rem 1rem 4rem;
}
.hero-eyebrow {
  font-family: var(--font-heading);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary, #c97e3a);
  margin-bottom: 1.1rem;
}
.hero-title {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.15;
  font-weight: 800;
  margin: 0 auto 1.25rem;
  max-width: 760px;
  color: var(--text-primary);
}
.hero-sub {
  max-width: 640px;
  margin: 0 auto 1.75rem;
  color: var(--text-secondary);
  font-size: 1.05rem;
  line-height: 1.55;
}
.hero-ctas {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.cta {
  padding: 0.7rem 1.4rem;
  border-radius: var(--radius-md);
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease;
}
.cta.primary {
  background: var(--primary, #c97e3a);
  color: white;
  border: 1px solid var(--primary, #c97e3a);
}
.cta.primary:hover:not(:disabled) {
  background: var(--primary-hover, #a66427);
  transform: translateY(-1px);
}
.cta.primary:disabled { opacity: 0.6; cursor: not-allowed; }
.cta.secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
.cta.secondary:hover { background: var(--bg-surface); transform: translateY(-1px); }
.cta.ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
}
.cta.ghost:hover { color: var(--primary); border-color: var(--border-light); }
.hero-foot {
  font-size: 0.82rem;
  color: var(--text-tertiary);
}

.how {
  border-top: 1px solid var(--border-light);
  padding-top: 3rem;
}
.how-title, .cat-title {
  font-family: var(--font-heading);
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  text-align: center;
}
.how-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
}
.step {
  padding: 1.5rem 1.25rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
}
.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary, #c97e3a);
  color: white;
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.85rem;
}
.step-h {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.05rem;
  margin-bottom: 0.4rem;
  color: var(--text-primary);
}
.step-p {
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.5;
}

.categories {
  margin-top: 3.5rem;
  border-top: 1px solid var(--border-light);
  padding-top: 3rem;
}
.cat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  justify-content: center;
}
.cat-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1.15rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 999px;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.cat-card.muted { opacity: 0.6; font-style: italic; }
.cat-icon { font-size: 1.15rem; }

.footnote {
  margin-top: 4rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-tertiary);
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
}
.footnote a { color: var(--primary); }

@media (max-width: 600px) {
  .landing { padding: 1.5rem 1rem 4rem; }
  .hero { padding: 1.5rem 0.5rem 2.5rem; }
  .hero-title { font-size: 1.6rem; }
  .hero-sub { font-size: 0.95rem; }
}
</style>
