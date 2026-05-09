<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import { CATEGORIES } from '@home-helper/shared';
import type { ProjectCategory, ExperienceLevel } from '@home-helper/shared';

const router = useRouter();
const projectStore = useProjectStore();

const selectedCategory = ref<ProjectCategory | null>(null);
const title = ref('');
const description = ref('');
const zipCode = ref('');
const budget = ref<number | undefined>(undefined);
const timeline = ref('');
const experienceLevel = ref<ExperienceLevel | undefined>(undefined);
const error = ref('');
const submitting = ref(false);

async function handleSubmit() {
  if (!selectedCategory.value) {
    error.value = 'Please select a category.';
    return;
  }
  if (!description.value.trim()) {
    error.value = 'Please provide a project description.';
    return;
  }
  if (!zipCode.value.trim()) {
    error.value = 'Please enter your zip code.';
    return;
  }

  error.value = '';
  submitting.value = true;
  try {
    const projectId = await projectStore.startProject({
      category: selectedCategory.value,
      title: title.value || CATEGORIES[selectedCategory.value].label,
      description: description.value,
      zipCode: zipCode.value,
      budget: budget.value,
      timeline: timeline.value || undefined,
      experienceLevel: experienceLevel.value,
    });
    router.push(`/project/${projectId}`);
  } catch (e: unknown) {
    error.value = (e as Error).message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="new-project">
    <!-- Step indicator -->
    <div class="step-bar">
      <div class="step" :class="{ active: true, done: selectedCategory }">
        <span class="step-num">1</span>
        <span class="step-label">Category</span>
      </div>
      <div class="step-line" :class="{ filled: selectedCategory }"></div>
      <div class="step" :class="{ active: !!selectedCategory }">
        <span class="step-num">2</span>
        <span class="step-label">Details</span>
      </div>
      <div class="step-line" :class="{ filled: description && zipCode }"></div>
      <div class="step" :class="{ active: !!description && !!zipCode }">
        <span class="step-num">3</span>
        <span class="step-label">Go</span>
      </div>
    </div>

    <h1>Start a New Project</h1>

    <section class="section">
      <div class="section-header">
        <h2>What are you building?</h2>
        <p class="section-desc">Choose the type of project you're planning.</p>
      </div>
      <div class="category-grid">
        <button
          v-for="(cat, key) in CATEGORIES"
          :key="key"
          class="category-card"
          :class="{ selected: selectedCategory === key }"
          @click="selectedCategory = key as ProjectCategory"
        >
          <span class="cat-icon">{{ cat.icon }}</span>
          <div class="cat-info">
            <strong>{{ cat.label }}</strong>
            <span class="cat-desc">{{ cat.description }}</span>
          </div>
          <div class="check-circle" v-if="selectedCategory === key">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </button>
      </div>
    </section>

    <form @submit.prevent="handleSubmit">
      <section class="section">
        <div class="section-header">
          <h2>Project Details</h2>
          <p class="section-desc">Tell us about your project so the AI advisor can help.</p>
        </div>
        <div class="field">
          <label for="title">Project Title <span class="optional">(optional)</span></label>
          <input id="title" v-model="title" type="text" placeholder="e.g. Master Bath Vanity Upgrade" />
        </div>
        <div class="field">
          <label for="description">Description <span class="required">*</span></label>
          <textarea id="description" v-model="description" rows="4" required placeholder="Describe what you want to accomplish — the more detail, the better advice you'll get..."></textarea>
        </div>
        <div class="field">
          <label for="zipCode">Zip Code <span class="required">*</span></label>
          <input id="zipCode" v-model="zipCode" type="text" required maxlength="10" placeholder="12345" />
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2>Optional Details</h2>
          <p class="section-desc">These help us give more accurate recommendations.</p>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="budget">Budget ($)</label>
            <input id="budget" v-model.number="budget" type="number" min="0" placeholder="e.g. 5000" />
          </div>
          <div class="field">
            <label for="timeline">Timeline</label>
            <input id="timeline" v-model="timeline" type="text" placeholder="e.g. 2 weeks" />
          </div>
          <div class="field">
            <label for="experience">Experience</label>
            <select id="experience" v-model="experienceLevel">
              <option :value="undefined">Select level...</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </section>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" class="submit-btn" :disabled="submitting">
        <span v-if="submitting" class="spinner"></span>
        {{ submitting ? 'Starting Project...' : 'Start Project' }}
        <svg v-if="!submitting" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </form>
  </div>
</template>

<style scoped>
.new-project {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

/* ─── Step Bar ─── */
.step-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 2rem;
  padding: 0 2rem;
}

.step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.35;
  transition: opacity 0.3s ease;
}

.step.active {
  opacity: 1;
}

.step-num {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-surface);
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  border: 2px solid var(--border);
  transition: all 0.3s ease;
}

.step.active .step-num {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.step.done .step-num {
  background: var(--success);
  border-color: var(--success);
  color: white;
}

.step-label {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.step-line {
  flex: 1;
  height: 2px;
  background: var(--border-light);
  margin: 0 0.75rem;
  max-width: 80px;
  transition: background 0.3s ease;
}

.step-line.filled {
  background: var(--primary-muted);
}

/* ─── Page Title ─── */
.new-project h1 {
  font-family: var(--font-heading);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2rem;
}

/* ─── Sections ─── */
.section {
  margin-bottom: 2rem;
}

.section-header {
  margin-bottom: 1rem;
}

.section-header h2 {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.15rem;
}

.section-desc {
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

/* ─── Category Cards ─── */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border: 2px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  cursor: pointer;
  text-align: left;
  transition: all 0.25s var(--ease-out);
  position: relative;
}

.category-card:hover {
  border-color: var(--primary-muted);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.category-card.selected {
  border-color: var(--primary);
  background: var(--primary-light);
  box-shadow: 0 0 0 3px var(--primary-glow);
}

.cat-icon {
  font-size: 2rem;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.category-card.selected .cat-icon {
  background: rgba(184, 92, 56, 0.1);
}

.cat-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
}

.cat-info strong {
  font-family: var(--font-heading);
  font-size: 0.95rem;
  color: var(--text-primary);
}

.cat-desc {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  line-height: 1.4;
}

.check-circle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  flex-shrink: 0;
  animation: popIn 0.25s var(--ease-spring);
}

@keyframes popIn {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

/* ─── Form Fields ─── */
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

.required {
  color: var(--primary);
}

.optional {
  color: var(--text-tertiary);
  font-weight: 400;
}

.field input,
.field textarea,
.field select {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 0.95rem;
  color: var(--text-primary);
  background: var(--bg-card);
  transition: all 0.2s ease;
}

.field input::placeholder,
.field textarea::placeholder {
  color: var(--text-tertiary);
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow);
}

.field textarea {
  resize: vertical;
  min-height: 100px;
  line-height: 1.5;
}

.field-row {
  display: flex;
  gap: 1rem;
}

.field-row .field {
  flex: 1;
}

/* ─── Error ─── */
.error {
  color: var(--danger);
  font-size: 0.85rem;
  margin-bottom: 1rem;
  padding: 0.6rem 0.85rem;
  background: var(--danger-light);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--danger);
}

/* ─── Submit ─── */
.submit-btn {
  width: 100%;
  padding: 0.85rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-heading);
  font-size: 1rem;
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
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .field-row {
    flex-direction: column;
    gap: 0;
  }
  .step-label {
    display: none;
  }
}
</style>
