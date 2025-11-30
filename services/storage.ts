import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Ancestor } from '../types';

const COLLECTION = 'ancestors';

export const StorageService = {
  // Subscribe to updates (Real-time)
  subscribe: (callback: (data: Ancestor[]) => void) => {
    // Order by dateAdded so new ones appear at the bottom/top reliably
    const q = query(collection(db, COLLECTION), orderBy('dateAdded', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          birthYear: d.birthYear,
          deathYear: d.deathYear,
          gender: d.gender,
          country: d.country,
          fatherId: d.fatherId,
          motherId: d.motherId,
          notes: d.notes,
          dateAdded: d.dateAdded?.toMillis ? d.dateAdded.toMillis() : Date.now()
        } as Ancestor;
      });
      callback(data);
    }, (error) => {
      console.error("Firestore subscription error:", error);
    });

    return unsubscribe;
  },

  // Add new ancestor
  add: async (data: Omit<Ancestor, 'id' | 'dateAdded'>) => {
    try {
      await addDoc(collection(db, COLLECTION), {
        ...data,
        dateAdded: serverTimestamp()
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  },

  // Update ancestor
  update: async (id: string, updates: Partial<Ancestor>) => {
    try {
      const docRef = doc(db, COLLECTION, id);
      await updateDoc(docRef, updates);
    } catch (e) {
      console.error("Error updating document: ", e);
    }
  },

  // Delete ancestor
  delete: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION, id));
    } catch (e) {
      console.error("Error deleting document: ", e);
    }
  },

  // Check and Seed (Optional, typically for local dev but kept for structure)
  checkAndSeed: async () => {
    // In a real Firestore app, we usually don't auto-seed on every load 
    // to prevent duplicate data if the check fails or is slow.
    // Leaving empty or manual trigger recommended.
  }
};