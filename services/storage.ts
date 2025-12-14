import { Ancestor } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'ancestry_ai_data';

// Simple event listener system to mimic real-time updates
type Listener = (data: Ancestor[]) => void;
let listeners: Listener[] = [];

const notifyListeners = () => {
  const data = StorageService.getAll();
  listeners.forEach(callback => callback(data));
};

export const StorageService = {
  // Retrieve all records from LocalStorage
  getAll: (): Ancestor[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed: Ancestor[] = JSON.parse(stored);
      // Sort by dateAdded descending (newest first)
      return parsed.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    } catch (e) {
      console.error("Failed to parse local storage data", e);
      return [];
    }
  },

  // Subscribe to updates (Mimics Firestore onSnapshot)
  subscribe: (callback: Listener) => {
    listeners.push(callback);
    // Initial data load
    callback(StorageService.getAll());
    
    // Return unsubscribe function
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  },

  // Add new ancestor
  add: async (data: Omit<Ancestor, 'id' | 'dateAdded'>) => {
    const ancestors = StorageService.getAll();
    const newId = uuidv4();
    
    const newAncestor: Ancestor = {
      ...data,
      id: newId,
      dateAdded: Date.now()
    };

    const updatedList = [newAncestor, ...ancestors];
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
        notifyListeners();
    } catch (e) {
        console.error("Storage limit exceeded", e);
        alert("Storage limit exceeded! Unable to save new ancestor.");
    }
  },

  // Update ancestor
  update: async (id: string, updates: Partial<Ancestor>) => {
    const ancestors = StorageService.getAll();
    const index = ancestors.findIndex(a => a.id === id);
    
    if (index !== -1) {
      ancestors[index] = { ...ancestors[index], ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ancestors));
        notifyListeners();
      } catch (e) {
        console.error("Storage update failed", e);
      }
    }
  },

  // Delete ancestor
  delete: async (id: string) => {
    const ancestors = StorageService.getAll();
    const updatedList = ancestors.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    notifyListeners();
  },

  // Check and Seed initial data if empty
  checkAndSeed: async () => {
    const data = StorageService.getAll();
    if (data.length === 0) {
      const seedData: Ancestor[] = [
        {
          id: uuidv4(),
          name: 'John Doe (Example)',
          birthYear: 1980,
          deathYear: null,
          gender: 'Male',
          country: 'United States',
          fatherId: null,
          motherId: null,
          notes: 'This is an example record to get you started.',
          dateAdded: Date.now()
        }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
      notifyListeners();
    }
  }
};