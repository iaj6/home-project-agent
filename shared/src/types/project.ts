export type ProjectCategory = 'bathroom-vanity' | 'deck-building';

export type ProjectStatus =
  | 'clarifying'
  | 'planning'
  | 'pricing'
  | 'synthesizing'
  | 'complete'
  | 'error';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Project {
  id: string;
  userId: string;
  homeId: string;
  category: ProjectCategory;
  title: string;
  description: string;
  zipCode: string;
  budget?: number;
  timeline?: string;
  experienceLevel?: ExperienceLevel;
  status: ProjectStatus;
  messageCount: number;
  currentAgentRunId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StartProjectInput {
  category: ProjectCategory;
  title: string;
  description: string;
  zipCode: string;
  homeId?: string;
  budget?: number;
  timeline?: string;
  experienceLevel?: ExperienceLevel;
}
