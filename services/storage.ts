import { Ancestor } from '../types';
import { db } from './firebase';
import firebase from 'firebase/compat/app';

const COLLECTION_NAME = 'ancestors';

export const StorageService = {
  // Subscribe to real-time updates
  subscribe: (callback: (data: Ancestor[]) => void) => {
    const q = db.collection(COLLECTION_NAME).orderBy('dateAdded', 'asc');
    
    const unsubscribe = q.onSnapshot((snapshot) => {
      const ancestors: Ancestor[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          birthYear: data.birthYear,
          deathYear: data.deathYear,
          gender: data.gender,
          country: data.country,
          fatherId: data.fatherId,
          motherId: data.motherId,
          notes: data.notes,
          dateAdded: data.dateAdded?.seconds ? data.dateAdded.seconds * 1000 : Date.now()
        } as Ancestor;
      });
      
      callback(ancestors);
    });

    return unsubscribe;
  },

  // Add new ancestor
  add: async (data: Omit<Ancestor, 'id' | 'dateAdded'>) => {
    await db.collection(COLLECTION_NAME).add({
      ...data,
      dateAdded: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  // Update ancestor
  update: async (id: string, updates: Partial<Ancestor>) => {
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    await docRef.update(updates);
  },

  // Delete ancestor
  delete: async (id: string) => {
    const docRef = db.collection(COLLECTION_NAME).doc(id);
    await docRef.delete();
  },

  // Seed data if empty (Utility)
  checkAndSeed: async () => {
    try {
        const colRef = db.collection(COLLECTION_NAME);
        const snapshot = await colRef.get();
        
        if (snapshot.empty) {
            console.log("Seeding Database...");
            const batch = db.batch();
            
            const seedData = [
                { name: "Arthur Smith", birthYear: 1920, deathYear: 1995, gender: 'Male', country: 'United Kingdom', fatherId: null, motherId: null, notes: "Paternal Grandfather" },
                { name: "Martha Smith", birthYear: 1925, deathYear: 2005, gender: 'Female', country: 'United Kingdom', fatherId: null, motherId: null, notes: "Paternal Grandmother" },
                { name: "John Smith", birthYear: 1950, deathYear: null, gender: 'Male', country: 'United States', notes: "Father" },
                { name: "Jane Doe", birthYear: 1952, deathYear: null, gender: 'Female', country: 'United States', fatherId: null, motherId: null, notes: "Mother" },
                { name: "Sam Smith", birthYear: 1980, deathYear: null, gender: 'Male', country: 'Canada', notes: "Self" },
            ];

            seedData.forEach((data) => {
                const docRef = colRef.doc(); // Auto-generated ID reference
                batch.set(docRef, { 
                    ...data, 
                    dateAdded: firebase.firestore.FieldValue.serverTimestamp() 
                });
            });

            await batch.commit();
        }
    } catch (e) {
        console.error("Error checking/seeding DB", e);
    }
  }
};