export type Gender = 'Male' | 'Female' | 'Unknown';

export interface Ancestor {
  id: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  gender: Gender;
  country?: string; 
  fatherId: string | null;
  motherId: string | null;
  notes: string;
  photoUrl?: string; // New field for avatar images
  dateAdded: number; 
}

export interface AncestorFormData {
  name: string;
  birthYear: string;
  deathYear: string;
  gender: Gender;
  country: string;
  fatherId: string;
  motherId: string;
  notes: string;
  photoUrl?: string;
}

export interface TimelineEvent {
  year: number;
  event: string;
}

export interface SESResult {
  socialClass: string;
  reasoning: string;
}