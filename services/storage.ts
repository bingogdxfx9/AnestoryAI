import { Ancestor } from '../types';
import { v4 as uuidv4 } from 'uuid'; // Assumption: Helper available, or we implement simple ID

// Simple unique ID generator since we don't have uuid lib installed in this env
const generateId = () => Math.random().toString(36).substr(2, 9);

const STORAGE_KEY = 'ancestry_app_data';

export const StorageService = {
  // Fetch all ancestors
  getAll: (): Ancestor[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Add new ancestor
  add: (data: Omit<Ancestor, 'id' | 'dateAdded'>): Ancestor => {
    const current = StorageService.getAll();
    const newAncestor: Ancestor = {
      ...data,
      id: generateId(),
      dateAdded: Date.now(),
    };
    const updated = [...current, newAncestor];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newAncestor;
  },

  // Update ancestor
  update: (id: string, updates: Partial<Ancestor>): void => {
    const current = StorageService.getAll();
    const updated = current.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  // Delete ancestor
  delete: (id: string): void => {
    const current = StorageService.getAll();
    // Also remove references to this person
    const updated = current
      .filter(item => item.id !== id)
      .map(item => ({
        ...item,
        fatherId: item.fatherId === id ? null : item.fatherId,
        motherId: item.motherId === id ? null : item.motherId
      }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  // Seed data if empty
  seedIfEmpty: () => {
    if (StorageService.getAll().length === 0) {
      // Create some dummy data for visualization
      const gp1 = generateId();
      const gp2 = generateId();
      const p1 = generateId();
      const p2 = generateId();
      const child = generateId();

      const seedData: Ancestor[] = [
        { id: gp1, name: "Arthur Smith", birthYear: 1920, deathYear: 1995, gender: 'Male', country: 'United Kingdom', fatherId: null, motherId: null, notes: "Paternal Grandfather", dateAdded: Date.now() },
        { id: gp2, name: "Martha Smith", birthYear: 1925, deathYear: 2005, gender: 'Female', country: 'United Kingdom', fatherId: null, motherId: null, notes: "Paternal Grandmother", dateAdded: Date.now() },
        { id: p1, name: "John Smith", birthYear: 1950, deathYear: null, gender: 'Male', country: 'United States', fatherId: gp1, motherId: gp2, notes: "Father", dateAdded: Date.now() },
        { id: p2, name: "Jane Doe", birthYear: 1952, deathYear: null, gender: 'Female', country: 'United States', fatherId: null, motherId: null, notes: "Mother", dateAdded: Date.now() },
        { id: child, name: "Sam Smith", birthYear: 1980, deathYear: null, gender: 'Male', country: 'Canada', fatherId: p1, motherId: p2, notes: "Self", dateAdded: Date.now() },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    }
  }
};