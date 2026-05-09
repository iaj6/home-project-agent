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
    <!-- ════════════════════════════ HERO ════════════════════════════
         Asymmetric: identity on the left, an animated "blueprint being
         drafted" composition on the right. The right column doubles as
         a visual signature of what the product does. -->
    <section class="hero">
      <div class="hero-grid">
        <!-- Left: identity + CTAs -->
        <div class="hero-identity">
          <div class="hero-stamp">
            <span class="stamp-dot"></span>
            FIELD-TESTED · BUILT WITH AGENTS
          </div>

          <h1 class="hero-title">
            Your home project,
            <span class="hero-title-em">drafted by an agent.</span>
          </h1>

          <p class="hero-sub">
            Describe what you want. Handy plans the work, sources real
            materials at <strong>your nearest Home Depot</strong>, pulls
            <strong>regional labor cost ranges</strong>, and hands back a
            <em>Project Blueprint</em> with sourced numbers and tutorial videos.
          </p>

          <div class="hero-ctas">
            <button class="cta primary" :disabled="authStore.loading" @click="start">
              <span>{{ authStore.loading ? 'Loading…' : 'Start a project' }}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
            <button class="cta secondary" @click="viewSample">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              See a sample blueprint
            </button>
            <button v-if="hasProjects" class="cta ghost" @click="viewProjects">
              My projects ({{ projectStore.projects.length }})
            </button>
          </div>

          <ul class="hero-bullets">
            <li><span>·</span> Free for now. About five minutes per project.</li>
            <li><span>·</span> No signup. Anonymous session, lives in this browser.</li>
            <li><span>·</span> Two categories so far: deck building &amp; bathroom vanity.</li>
          </ul>
        </div>

        <!-- Right: visual blueprint composition -->
        <div class="hero-art" aria-hidden="true">
          <div class="art-frame">
            <!-- Corner brackets -->
            <span class="art-corner tl"></span>
            <span class="art-corner tr"></span>
            <span class="art-corner bl"></span>
            <span class="art-corner br"></span>

            <!-- Top meta strip -->
            <div class="art-strip">
              <span class="as-k">DWG</span>
              <span class="as-v">HHA-DEMO</span>
              <span class="as-k">SCALE</span>
              <span class="as-v">1:24</span>
            </div>

            <!-- The "drawing" — a stylized deck plan, drawn live -->
            <svg class="art-drawing" viewBox="0 0 320 200" fill="none" preserveAspectRatio="xMidYMid meet">
              <!-- House outline -->
              <rect x="20" y="20" width="100" height="160" stroke="#E7C99B" stroke-width="1.4" stroke-dasharray="4 3" opacity="0.7"/>
              <text x="32" y="40" fill="#E7C99B" opacity="0.7" font-family="var(--font-mono)" font-size="9">HOUSE</text>

              <!-- Deck outline (animated draw) -->
              <rect class="art-deck" x="120" y="50" width="180" height="120" stroke="#F5D9A8" stroke-width="2" fill="rgba(245, 217, 168, 0.04)"/>

              <!-- Joists -->
              <g class="art-joists" stroke="#B85C38" stroke-width="0.8" opacity="0">
                <line x1="120" y1="65" x2="300" y2="65"/>
                <line x1="120" y1="80" x2="300" y2="80"/>
                <line x1="120" y1="95" x2="300" y2="95"/>
                <line x1="120" y1="110" x2="300" y2="110"/>
                <line x1="120" y1="125" x2="300" y2="125"/>
                <line x1="120" y1="140" x2="300" y2="140"/>
                <line x1="120" y1="155" x2="300" y2="155"/>
              </g>

              <!-- Footings -->
              <g class="art-footings" fill="#B85C38" opacity="0">
                <circle cx="135" cy="60" r="3"/>
                <circle cx="220" cy="60" r="3"/>
                <circle cx="290" cy="60" r="3"/>
                <circle cx="135" cy="160" r="3"/>
                <circle cx="220" cy="160" r="3"/>
                <circle cx="290" cy="160" r="3"/>
              </g>

              <!-- Stairs -->
              <g class="art-stairs" stroke="#F5D9A8" stroke-width="1.2" opacity="0">
                <line x1="200" y1="170" x2="240" y2="170"/>
                <line x1="200" y1="178" x2="240" y2="178"/>
                <line x1="200" y1="186" x2="240" y2="186"/>
                <line x1="200" y1="194" x2="240" y2="194"/>
              </g>

              <!-- Dimension line -->
              <g class="art-dim" stroke="#E7C99B" stroke-width="0.6" opacity="0">
                <line x1="120" y1="38" x2="300" y2="38"/>
                <line x1="120" y1="34" x2="120" y2="42"/>
                <line x1="300" y1="34" x2="300" y2="42"/>
                <text x="200" y="32" text-anchor="middle" fill="#E7C99B" font-family="var(--font-mono)" font-size="8">18'-0"</text>
              </g>

              <!-- Annotation -->
              <text class="art-anno-deck" x="210" y="115" text-anchor="middle" fill="#F5D9A8" font-family="var(--font-mono)" font-size="9" opacity="0">DECK · 12 × 18</text>
            </svg>

            <!-- Bottom signature strip -->
            <div class="art-sig">
              <span class="sig-k">DRAFTED BY</span>
              <span class="sig-name">Handy</span>
            </div>
          </div>

          <!-- Floating "live agent" pill -->
          <div class="art-pill">
            <span class="pill-dot"></span>
            <span>Agent live</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════ HOW ════════════════════════════ -->
    <section class="how">
      <header class="how-mark">
        <span class="mk-num">§01</span>
        <span class="mk-title">How it works</span>
        <span class="mk-rule"></span>
        <span class="mk-tag">~5 MIN END TO END</span>
      </header>
      <div class="how-grid">
        <div class="step">
          <div class="step-num">1</div>
          <h3 class="step-h">You describe</h3>
          <p class="step-p">
            Pick a category, give a ZIP, write a sentence about what you want.
            Handy asks a few follow-up questions to nail the spec.
          </p>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <h3 class="step-h">Agent works</h3>
          <p class="step-p">
            Watch the four-phase loop run live: <em>plan → price → labor →
            synthesize</em>. Real Home Depot SKUs, real labor ranges. About five
            minutes.
          </p>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <h3 class="step-h">You get a blueprint</h3>
          <p class="step-p">
            Materials cart with prices &amp; links, labor cost range, ordered
            task list, code warnings, DIY tradeoffs, confidence scores, tutorial
            videos. All sourced.
          </p>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════ CATEGORIES ════════════════════════════ -->
    <section class="categories">
      <header class="how-mark">
        <span class="mk-num">§02</span>
        <span class="mk-title">Categories supported today</span>
        <span class="mk-rule"></span>
        <span class="mk-tag">MORE COMING</span>
      </header>
      <div class="cat-row">
        <button class="cat-card" @click="start">
          <span class="cat-icon">🚿</span>
          <div class="cat-meta">
            <div class="cat-name">Bathroom Vanity</div>
            <div class="cat-sub">Replace or upgrade</div>
          </div>
        </button>
        <button class="cat-card" @click="start">
          <span class="cat-icon">🏗️</span>
          <div class="cat-meta">
            <div class="cat-name">Deck Building</div>
            <div class="cat-sub">New build or replacement</div>
          </div>
        </button>
        <div class="cat-card muted">
          <span class="cat-icon">+</span>
          <div class="cat-meta">
            <div class="cat-name">More to come</div>
            <div class="cat-sub">Kitchen, fence, roofing…</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════ FOOTER ════════════════════════════ -->
    <footer class="footnote">
      <div class="fn-stamp">DEMO · BUILT WITH AGENTS</div>
      <p>
        Built as a demonstration of agentic apps with live retail data. The
        agent loop, structured outputs, and Crawlbase fetcher chain are the
        interesting bits.
      </p>
    </footer>
  </div>
</template>

<style scoped>
/* ═════════════════ Page shell ═════════════════ */
.landing {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 5rem;
}

/* ═════════════════ HERO ═════════════════ */
.hero {
  padding: 2rem 0 3.5rem;
  position: relative;
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 3rem;
  align-items: center;
}

/* ── Left: identity ── */
.hero-identity { min-width: 0; }

.hero-stamp {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--primary);
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--primary-muted);
  border-radius: 999px;
  background: var(--primary-light);
  margin-bottom: 1.4rem;
}
.stamp-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
  animation: dotPulse 1.6s ease-in-out infinite;
}
@keyframes dotPulse {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 1; }
}

.hero-title {
  font-family: var(--font-heading);
  font-size: clamp(2.2rem, 5.5vw, 3.4rem);
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin-bottom: 1.1rem;
}
.hero-title-em {
  display: block;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 400;
  color: var(--primary);
  letter-spacing: -0.01em;
  font-size: 0.95em;
  margin-top: 0.05em;
}

.hero-sub {
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 1.6rem;
  max-width: 540px;
}
.hero-sub strong { color: var(--text-primary); font-weight: 600; }
.hero-sub em {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--primary);
  font-size: 1.06em;
}

.hero-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 1.5rem;
}
.cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.25rem;
  border-radius: var(--radius-md);
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.18s var(--ease-out);
  border: 1px solid transparent;
}
.cta.primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 1px 0 var(--primary-hover) inset, var(--shadow-sm);
}
.cta.primary:hover:not(:disabled) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
.cta.primary:disabled { opacity: 0.55; cursor: not-allowed; }
.cta.secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border-color: var(--border);
}
.cta.secondary:hover {
  background: var(--bg-surface);
  border-color: var(--text-tertiary);
  transform: translateY(-1px);
}
.cta.ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
}
.cta.ghost:hover { color: var(--primary); }

.hero-bullets {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
  font-family: var(--font-heading);
  font-size: 0.82rem;
  color: var(--text-tertiary);
}
.hero-bullets li { display: flex; gap: 0.45rem; }
.hero-bullets span { color: var(--primary); font-weight: 700; }

/* ── Right: art ── */
.hero-art {
  position: relative;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.art-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--bg-dark);
  background-image: var(--grid-pattern-dark);
  background-size: 28px 28px;
  border-radius: var(--radius-lg);
  padding: 1rem 1rem 0.8rem;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  transform: rotate(1.5deg);
  transition: transform 0.3s var(--ease-out);
}
.art-frame:hover { transform: rotate(0); }
.art-frame::before {
  /* warm glow inside the frame */
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 75% 40%, rgba(184, 92, 56, 0.12), transparent 65%);
  pointer-events: none;
  z-index: 0;
}

.art-corner {
  position: absolute;
  width: 14px;
  height: 14px;
  z-index: 2;
}
.art-corner.tl { top: 6px; left: 6px; border-top: 1.5px solid var(--primary-muted); border-left: 1.5px solid var(--primary-muted); }
.art-corner.tr { top: 6px; right: 6px; border-top: 1.5px solid var(--primary-muted); border-right: 1.5px solid var(--primary-muted); }
.art-corner.bl { bottom: 6px; left: 6px; border-bottom: 1.5px solid var(--primary-muted); border-left: 1.5px solid var(--primary-muted); }
.art-corner.br { bottom: 6px; right: 6px; border-bottom: 1.5px solid var(--primary-muted); border-right: 1.5px solid var(--primary-muted); }

.art-strip {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 0.7rem;
  padding-bottom: 0.55rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px dashed rgba(231, 201, 155, 0.25);
}
.as-k {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(231, 201, 155, 0.6);
  text-transform: uppercase;
}
.as-v {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 600;
  color: #E7C99B;
  margin-right: 0.4rem;
  letter-spacing: 0.04em;
}

.art-drawing {
  position: relative;
  z-index: 1;
  flex: 1;
  width: 100%;
  height: auto;
}
/* Animated draw-in for the deck outline */
.art-deck {
  stroke-dasharray: 600;
  stroke-dashoffset: 600;
  animation: drawDeck 1.4s var(--ease-out) 0.3s forwards;
}
.art-joists { animation: fadeInG 0.6s ease-out 1.6s forwards; }
.art-footings { animation: fadeInG 0.5s ease-out 2.0s forwards; }
.art-stairs { animation: fadeInG 0.5s ease-out 2.3s forwards; }
.art-dim { animation: fadeInG 0.5s ease-out 2.5s forwards; }
.art-anno-deck { animation: fadeInG 0.5s ease-out 2.7s forwards; }
@keyframes drawDeck {
  to { stroke-dashoffset: 0; }
}
@keyframes fadeInG {
  to { opacity: 1; }
}

.art-sig {
  position: relative;
  z-index: 1;
  margin-top: 0.55rem;
  padding-top: 0.5rem;
  border-top: 1px dashed rgba(231, 201, 155, 0.25);
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
}
.sig-k {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(231, 201, 155, 0.55);
}
.sig-name {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 1.05rem;
  color: #E7C99B;
}

.art-pill {
  position: absolute;
  top: -10px;
  right: -8px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.32rem 0.7rem;
  background: var(--bg-card);
  border: 1px solid var(--success);
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--success);
  text-transform: uppercase;
  box-shadow: var(--shadow-sm);
  z-index: 3;
  transform: rotate(-3deg);
}
.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  animation: dotPulse 1.4s ease-in-out infinite;
}

/* ═════════════════ HOW + CATEGORIES — shared section marker ═════════════════ */
.how, .categories {
  margin-top: 3rem;
}
.how-mark {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1.5rem;
}
.mk-num {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.22rem 0.5rem;
  border: 1px solid var(--blueprint-ink);
  background: var(--blueprint-ink-soft);
  color: var(--blueprint-ink);
  border-radius: 3px;
  flex-shrink: 0;
}
.mk-title {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  flex-shrink: 0;
}
.mk-rule {
  flex: 1;
  height: 1px;
  background: var(--border);
  position: relative;
}
.mk-rule::before, .mk-rule::after {
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

/* ── How grid ── */
.how-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}
.step {
  position: relative;
  padding: 1.5rem 1.3rem 1.3rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  transition: all 0.2s var(--ease-out);
}
.step:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-muted);
}
.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-dark);
  color: #E7C99B;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 400;
  font-size: 1.2rem;
  margin-bottom: 0.85rem;
  border: 2px solid var(--primary-muted);
}
.step-h {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.05rem;
  margin-bottom: 0.45rem;
  color: var(--text-primary);
}
.step-p {
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.55;
}
.step-p em {
  font-family: var(--font-mono);
  font-style: normal;
  font-size: 0.85em;
  background: var(--blueprint-ink-soft);
  color: var(--blueprint-ink);
  padding: 0.05em 0.35em;
  border-radius: 2px;
}

/* ── Categories ── */
.cat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.85rem;
}
.cat-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: all 0.18s var(--ease-out);
}
.cat-card:hover:not(.muted) {
  background: var(--primary-light);
  border-color: var(--primary-muted);
  transform: translateY(-1px);
}
.cat-card.muted {
  opacity: 0.55;
  cursor: default;
  border-style: dashed;
}
.cat-icon {
  font-size: 1.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.cat-meta { display: flex; flex-direction: column; }
.cat-name {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--text-primary);
}
.cat-sub {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  margin-top: 0.1rem;
}

/* ── Footnote ── */
.footnote {
  margin-top: 4rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}
.fn-stamp {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  padding: 0.3rem 0.85rem;
  border: 1.5px solid var(--text-tertiary);
  border-radius: 3px;
  color: var(--text-tertiary);
  transform: rotate(-1.5deg);
  background-image: var(--hatch-pattern);
  background-blend-mode: multiply;
}
.footnote p {
  max-width: 540px;
  font-size: 0.85rem;
  color: var(--text-tertiary);
  line-height: 1.55;
}

/* ═════════════════ Mobile ═════════════════ */
@media (max-width: 820px) {
  .hero-grid { grid-template-columns: 1fr; gap: 2rem; }
  .hero-art { order: 2; min-height: 260px; }
  .art-frame { transform: none; }
  .art-pill { right: 8px; }
}
@media (max-width: 600px) {
  .landing { padding: 1rem 1rem 4rem; }
  .hero { padding: 1.25rem 0 2.5rem; }
  .hero-title { font-size: 1.95rem; }
  .hero-sub { font-size: 0.95rem; }
  .cta { padding: 0.6rem 1rem; font-size: 0.88rem; }
  .mk-tag { display: none; }
}
</style>
