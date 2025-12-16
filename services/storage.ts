import { db } from './firebase';
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

const COLLECTION_NAME = 'ancestors';

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
      console.error("Firestore subscription error:", error);
      if (onError) onError(error);
    });

    return unsubscribe;
  },

  // Add new ancestor
  add: async (data: Omit<Ancestor, 'id' | 'dateAdded'>) => {
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        dateAdded: Date.now()
      });
    } catch (e) {
      console.error("Error adding document: ", e);
      throw e; // Propagate error to let UI know
    }
  },

  // Update ancestor
  update: async (id: string, updates: Partial<Ancestor>) => {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      // Ensure we don't accidentally try to write the ID field into the document data
      const { id: _, ...cleanUpdates } = updates as any;
      await updateDoc(docRef, cleanUpdates);
    } catch (e) {
      console.error("Error updating document: ", e);
      throw e;
    }
  },

  // Delete ancestor
  delete: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (e) {
      console.error("Error deleting document: ", e);
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
        if (e.code !== 'permission-denied') {
            console.error("Error seeding data:", e);
        }
    }
  }
};