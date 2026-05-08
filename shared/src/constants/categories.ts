import type { ProjectCategory } from '../types/project';

export interface CategoryMeta {
  id: ProjectCategory;
  label: string;
  description: string;
  icon: string;
  clarificationGuidance: string;
  /** Search query used for the post-synthesize YouTube enrichment.
   * Hand-tuned to disambiguate from collisions with unrelated meanings of the label
   * (e.g. "Deck Building" vs. card-game decks). Keep it consumer-friendly. */
  youtubeQuery: string;
}

export const CATEGORIES: Record<ProjectCategory, CategoryMeta> = {
  'bathroom-vanity': {
    id: 'bathroom-vanity',
    label: 'Bathroom Vanity Replacement',
    description: 'Replace or upgrade your bathroom vanity, including countertop, sink, and plumbing connections.',
    icon: '🚿',
    clarificationGuidance: `Key areas to clarify for bathroom vanity projects:
- Current vanity dimensions and desired size
- Single or double sink configuration
- Countertop material preference (granite, quartz, laminate, etc.)
- Whether plumbing needs to be moved or just reconnected
- Wall condition behind existing vanity
- Whether backsplash work is included
- Desired faucet style and finish
- Storage needs (drawers vs. doors)
- Whether flooring under vanity needs attention
- Electrical (lighting, outlets) changes needed`,
    youtubeQuery: 'how to install a bathroom vanity DIY',
  },
  'deck-building': {
    id: 'deck-building',
    label: 'Deck Building',
    description: 'Build a new deck or replace an existing one, including framing, decking, railings, and stairs.',
    icon: '🏗️',
    clarificationGuidance: `Key areas to clarify for deck building projects:
- Desired deck dimensions and shape
- Deck height (ground level vs. elevated)
- Material preference (pressure-treated wood, composite, cedar, etc.)
- Railing style and material
- Number of stairways needed
- Whether it attaches to the house or is freestanding
- Local building code and permit requirements
- Ground conditions (slope, soil type)
- Desired features (built-in seating, planters, lighting)
- Existing structure removal needed`,
    youtubeQuery: 'how to build a backyard wood deck DIY tutorial',
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES) as ProjectCategory[];
