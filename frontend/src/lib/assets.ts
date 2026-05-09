import type { ProjectCategory } from '@home-helper/shared';

/**
 * Resolves a public asset path for a given project category. Falls back to
 * undefined if no PNG exists for that category — the caller can use the
 * emoji from CATEGORIES[id].icon as the fallback render.
 */
export function categoryIcon(id: ProjectCategory): string | undefined {
  switch (id) {
    case 'deck-building':
      return '/assets/icon-deck-building.png';
    case 'bathroom-vanity':
      return '/assets/icon-bathroom-vanity.png';
    default:
      return undefined;
  }
}

export const LOGO_LIGHT = '/assets/logo-mark-light.png';
export const LOGO_DARK = '/assets/logo-mark-dark.png';
