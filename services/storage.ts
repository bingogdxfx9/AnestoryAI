import { db, firebaseConfig } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs,
  limit
} from 'firebase/firestore';
import { Ancestor } from '../types';

// Ensure appId is present to avoid "undefined" in path
const appId = firebaseConfig.appId || '1:927330435478:web:d0d6c70c99765ae182ddb7';

// Update collection name to match the security rule path: /artifacts/{appId}/public/data/familyTree/
const COLLECTION_NAME = `artifacts/${appId}/public/data/familyTree`;

// Helper to sanitize data for Firestore
// Firestore throws an error if a field is 'undefined'.
// We explicitly remove such keys.
// We also convert NaN to null.
const sanitizeData = (data: any) => {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    const val = sanitized[key];
    if (val === undefined) {
      delete sanitized[key]; // Delete the key entirely
    } else if (typeof val === 'number' && isNaN(val)) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

export const StorageService = {
  // Subscribe to updates (Real-time listener)
  subscribe: (callback: (data: Ancestor[]) => void, onError?: (error: any) => void) => {
    // Order by dateAdded descending to match previous behavior
    const q = query(collection(db, COLLECTION_NAME), orderBy('dateAdded', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ancestors = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Ancestor));
      callback(ancestors);
    }, (error) => {
      // Pass error to callback without logging to console here if it's permission-denied
      if (error.code !== 'permission-denied') {
          console.error("Firestore subscription error:", error);
      }
      if (onError) onError(error);
    });

    return unsubscribe;
  },

  // Add new ancestor
  add: async (data: Omit<Ancestor, 'id' | 'dateAdded'>) => {
    try {
      const safeData = sanitizeData(data);
      await addDoc(collection(db, COLLECTION_NAME), {
        ...safeData,
        dateAdded: Date.now()
      });
    } catch (e: any) {
      if (e.code !== 'permission-denied') {
        console.error("Error adding document: ", e);
      }
      throw e; // Propagate error to let UI know
    }
  },

  // Update ancestor
  update: async (id: string, updates: Partial<Ancestor>) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      // Ensure we don't accidentally try to write the ID field into the document data
      const { id: _, ...cleanUpdates } = updates as any;
      await updateDoc(docRef, sanitizeData(cleanUpdates));
    } catch (e: any) {
      if (e.code !== 'permission-denied') {
        console.error("Error updating document: ", e);
      }
      throw e;
    }
  },

  // Delete ancestor
  delete: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (e: any) {
      if (e.code !== 'permission-denied') {
        console.error("Error deleting document: ", e);
      }
      throw e;
    }
  },

  // Check and Seed initial data if empty
  checkAndSeed: async () => {
    try {
        const q = query(collection(db, COLLECTION_NAME), limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            const seedData: Omit<Ancestor, 'id'> = {
                name: 'John Doe (Example)',
                birthYear: 1980,
                deathYear: null,
                gender: 'Male',
                country: 'United States',
                fatherId: null,
                motherId: null,
                notes: 'This is an example record to get you started.',
                dateAdded: Date.now()
            };
            await StorageService.add(seedData);
        }
    } catch (e: any) {
        // Suppress permission denied errors in seeding as the main app will show the error screen
        // This prevents the specific "Error adding document" from cluttering the console if auth/rules aren't ready
        if (e.code !== 'permission-denied') {
            console.error("Error seeding data:", e);
        }
    }
  }
};