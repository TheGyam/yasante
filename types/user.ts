export type HairType = 'straight' | 'wavy' | 'curly' | 'coily' | 'kinky';
export type HairTexture = 'fine' | 'medium' | 'thick';
export type HairPorosity = 'low' | 'medium' | 'high';
export type HairDensity = 'low' | 'medium' | 'high';

export interface HairProfile {
  type: HairType;
  texture: HairTexture;
  porosity: HairPorosity;
  density: HairDensity;
  mainConcerns: string[];
  goals: string[];
}

export interface User {
  id: string;
  email: string;
  name?: string;
  hairProfile?: HairProfile;
  createdAt: string;
  updatedAt: string;
}













