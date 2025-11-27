import { Ancestor } from '../types';

const STORAGE_KEY = 'ancestors_data';
let listeners: ((data: Ancestor[]) => void)[] = [];

const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Helper to get data
const getLocalData = (): Ancestor[] => {
  try {
    const str = localStorage.getItem(STORAGE_KEY);
    return str ? JSON.parse(str) : [];
  } catch (e) {
    console.error("Error parsing local storage", e);
    return [];
  }
};

// Helper to set data
const setLocalData = (data: Ancestor[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    notifyListeners();
  } catch (e) {
    console.error("Error saving to local storage", e);
  }
};

const notifyListeners = () => {
  const data = getLocalData();
  listeners.forEach(cb => cb(data));
};

export const StorageService = {
  // Subscribe to updates (simulating real-time behavior)
  subscribe: (callback: (data: Ancestor[]) => void) => {
    listeners.push(callback);
    // Initial data
    callback(getLocalData());

    return () => {
        listeners = listeners.filter(l => l !== callback);
    };
  },

  // Add new ancestor
  add: async (data: Omit<Ancestor, 'id' | 'dateAdded'>) => {
    const ancestors = getLocalData();
    const newAncestor: Ancestor = {
      ...data,
      id: generateId(),
      dateAdded: Date.now()
    };
    ancestors.push(newAncestor);
    setLocalData(ancestors);
  },

  // Update ancestor
  update: async (id: string, updates: Partial<Ancestor>) => {
    let ancestors = getLocalData();
    ancestors = ancestors.map(a => a.id === id ? { ...a, ...updates } : a);
    setLocalData(ancestors);
  },

  // Delete ancestor
  delete: async (id: string) => {
    let ancestors = getLocalData();
    ancestors = ancestors.filter(a => a.id !== id);
    setLocalData(ancestors);
  },

  // Seed data if empty (Utility)
  checkAndSeed: async () => {
    const ancestors = getLocalData();
    
    if (ancestors.length === 0) {
        console.log("Seeding Local Database...");
        
        const id1 = generateId();
        const id2 = generateId();
        const id3 = generateId();
        const id4 = generateId();
        const id5 = generateId();

        const seedData: Ancestor[] = [
            { id: id1, name: "Arthur Smith", birthYear: 1920, deathYear: 1995, gender: 'Male', country: 'United Kingdom', fatherId: null, motherId: null, notes: "Paternal Grandfather", dateAdded: Date.now() },
            { id: id2, name: "Martha Smith", birthYear: 1925, deathYear: 2005, gender: 'Female', country: 'United Kingdom', fatherId: null, motherId: null, notes: "Paternal Grandmother", dateAdded: Date.now() },
            { id: id3, name: "John Smith", birthYear: 1950, deathYear: null, gender: 'Male', country: 'United States', fatherId: id1, motherId: id2, notes: "Father", dateAdded: Date.now() },
            { id: id4, name: "Jane Doe", birthYear: 1952, deathYear: null, gender: 'Female', country: 'United States', fatherId: null, motherId: null, notes: "Mother", dateAdded: Date.now() },
            { id: id5, name: "Sam Smith", birthYear: 1980, deathYear: null, gender: 'Male', country: 'Canada', fatherId: id3, motherId: id4, notes: "Self", dateAdded: Date.now() },
        ];

        setLocalData(seedData);
    }
  }
};