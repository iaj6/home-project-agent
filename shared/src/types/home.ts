export type HomeSystemKind =
  | 'hvac'
  | 'water_heater'
  | 'roof'
  | 'appliance'
  | 'other';

export interface HomeSystem {
  kind: HomeSystemKind;
  label: string;
  installedDate?: Date;
  brand?: string;
  model?: string;
  warrantyExpires?: Date;
  lastServiced?: Date;
  notes?: string;
}

export interface Home {
  id: string;
  userId: string;
  nickname: string;
  zipCode: string;
  address?: string;
  yearBuilt?: number;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  systems?: HomeSystem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHomeInput {
  nickname: string;
  zipCode: string;
  address?: string;
  yearBuilt?: number;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
}
