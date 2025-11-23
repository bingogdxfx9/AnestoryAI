export type Gender = 'Male' | 'Female' | 'Unknown';

export interface Ancestor {
  id: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  gender: Gender;
  country?: string; // New field
  fatherId: string | null;
  motherId: string | null;
  notes: string;
  dateAdded: number; // Unix timestamp to mock Firestore Timestamp
}

export interface AncestorFormData {
  name: string;
  birthYear: string;
  deathYear: string;
  gender: Gender;
  country: string; // New field
  fatherId: string;
  motherId: string;
  notes: string;
}

export interface TreeLink {
  source: HierarchyNode;
  target: HierarchyNode;
}

export interface HierarchyNode {
  name: string;
  id: string;
  data: Ancestor;
  children?: HierarchyNode[];
  _children?: HierarchyNode[]; // For collapsing
}

export type RelationType = 
  | 'Self' 
  | 'Parent' 
  | 'Child' 
  | 'Sibling' 
  | 'Spouse' 
  | 'Grandparent' 
  | 'Grandchild' 
  | 'Aunt/Uncle' 
  | 'Niece/Nephew' 
  | 'Cousin' 
  | 'Distant Relative' 
  | 'No Known Relation';

export interface TimelineEvent {
  year: number;
  event: string;
}

export interface SESResult {
  socialClass: string;
  reasoning: string;
}