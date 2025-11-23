import { Ancestor } from '../types';

// Check for circular references (e.g., A is father of B, B cannot be father of A)
export const hasCircularReference = (
  ancestors: Ancestor[],
  personId: string,
  proposedParentId: string | null
): boolean => {
  if (!proposedParentId) return false;
  if (personId === proposedParentId) return true;

  // Build a map for O(1) lookups
  const map = new Map<string, Ancestor>();
  ancestors.forEach((a) => map.set(a.id, a));

  // BFS or DFS to see if 'personId' is an ancestor of 'proposedParentId'
  // If 'personId' is already an ancestor of the proposed parent, 
  // then setting proposedParent as a parent of personId would create a loop.
  
  const queue = [proposedParentId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    if (currentId === personId) return true;

    const currentPerson = map.get(currentId);
    if (currentPerson) {
      if (currentPerson.fatherId) queue.push(currentPerson.fatherId);
      if (currentPerson.motherId) queue.push(currentPerson.motherId);
    }
  }

  return false;
};

// Simple relationship calculator logic
export const calculateRelationship = (
  ancestors: Ancestor[],
  personAId: string,
  personBId: string
): string => {
  if (personAId === personBId) return "Self";

  const map = new Map<string, Ancestor>();
  ancestors.forEach((a) => map.set(a.id, a));

  const personA = map.get(personAId);
  const personB = map.get(personBId);

  if (!personA || !personB) return "Unknown";

  // Check direct parent
  if (personA.fatherId === personBId || personA.motherId === personBId) return "Child of selected";
  if (personB.fatherId === personAId || personB.motherId === personAId) return "Parent of selected";

  // Check Siblings (share at least one parent)
  const shareFather = personA.fatherId && personA.fatherId === personB.fatherId;
  const shareMother = personA.motherId && personA.motherId === personB.motherId;

  if (shareFather && shareMother) return "Full Sibling";
  if (shareFather || shareMother) return "Half Sibling";

  // Basic Cousin Check (Parents are siblings)
  const parentsA = [personA.fatherId, personA.motherId].filter(Boolean) as string[];
  const parentsB = [personB.fatherId, personB.motherId].filter(Boolean) as string[];

  for (const pA of parentsA) {
    for (const pB of parentsB) {
      if (calculateRelationship(ancestors, pA, pB).includes("Sibling")) {
        return "First Cousin";
      }
    }
  }

  // Grandparent check
  if (parentsA.includes(personBId)) return "Child"; // Already checked, but logic flows
  // Check if B is parent of A's parent
  for (const pA of parentsA) {
    const parentNode = map.get(pA);
    if (parentNode && (parentNode.fatherId === personBId || parentNode.motherId === personBId)) {
      return "Grandchild of selected";
    }
  }
  
  // Check if A is parent of B's parent
  for (const pB of parentsB) {
    const parentNode = map.get(pB);
    if (parentNode && (parentNode.fatherId === personAId || parentNode.motherId === personAId)) {
      return "Grandparent of selected";
    }
  }

  // Fallback for complex graph traversal
  return "Distant Relative or No Relation Found (Basic Search)";
};

// Calculate General Stats
export const calculateStats = (ancestors: Ancestor[]) => {
  let totalLifespan = 0;
  let countWithDates = 0;
  let maleCount = 0;
  let femaleCount = 0;
  let unknownCount = 0;

  ancestors.forEach(a => {
    if (a.gender === 'Male') maleCount++;
    else if (a.gender === 'Female') femaleCount++;
    else unknownCount++;

    if (a.birthYear && a.deathYear && a.deathYear > a.birthYear) {
      totalLifespan += (a.deathYear - a.birthYear);
      countWithDates++;
    }
  });

  return {
    total: ancestors.length,
    male: maleCount,
    female: femaleCount,
    unknown: unknownCount,
    avgLifespan: countWithDates > 0 ? (totalLifespan / countWithDates).toFixed(1) : "N/A"
  };
};

// --- New Advanced Analytics ---

export const calculateCompleteness = (a: Ancestor): number => {
  let score = 0;
  const totalWeight = 5; 
  // Weights: Name(1), Gender(1), Birth(1), Death(1), Parents(1)
  if (a.name) score++;
  if (a.gender !== 'Unknown') score++;
  if (a.birthYear) score++;
  if (a.deathYear) score++;
  if (a.fatherId || a.motherId) score++;
  
  return Math.round((score / totalWeight) * 100);
};

export const findPotentialDuplicates = (ancestors: Ancestor[]): Ancestor[][] => {
  const groups: Record<string, Ancestor[]> = {};
  
  ancestors.forEach(a => {
    // Check by Name + BirthYear
    // A more robust check might include parents, but this is a good first pass
    const key = `${a.name.toLowerCase().trim()}-${a.birthYear || '?'}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  // Return only groups that have more than 1 entry
  return Object.values(groups).filter(g => g.length > 1);
};

export const getLifespanDistribution = (ancestors: Ancestor[]) => {
  // Buckets of 10 years: 0-9, 10-19... 90-99, 100+
  const buckets = new Array(11).fill(0);
  ancestors.forEach(a => {
      if (a.birthYear && a.deathYear && a.deathYear >= a.birthYear) {
          const age = a.deathYear - a.birthYear;
          // Clamp to index 10 (100+)
          const index = Math.min(Math.floor(age / 10), 10);
          buckets[index]++;
      }
  });
  return buckets.map((count, i) => ({
      range: i === 10 ? '100+' : `${i * 10}-${i * 10 + 9}`,
      count,
      label: i === 10 ? '100+' : `${i*10}s`
  }));
};

export const getAverageGenerationSpan = (ancestors: Ancestor[]): number | null => {
  let totalSpan = 0;
  let count = 0;
  
  const map = new Map(ancestors.map(a => [a.id, a]));
  
  ancestors.forEach(child => {
      if (child.birthYear) {
          // Check Father
          if (child.fatherId) {
              const father = map.get(child.fatherId);
              if (father && father.birthYear) {
                  const span = child.birthYear - father.birthYear;
                  if (span > 10 && span < 80) { // Reasonable biological limits check
                    totalSpan += span;
                    count++;
                  }
              }
          }
          // Check Mother
          if (child.motherId) {
              const mother = map.get(child.motherId);
              if (mother && mother.birthYear) {
                  const span = child.birthYear - mother.birthYear;
                  if (span > 10 && span < 80) {
                    totalSpan += span;
                    count++;
                  }
              }
          }
      }
  });
  
  return count > 0 ? parseFloat((totalSpan / count).toFixed(1)) : null;
};

// --- Consistency Checks ---
export interface Anomaly {
  id: string;
  name: string;
  type: 'Error' | 'Warning';
  message: string;
}

export const findLocalAnomalies = (ancestors: Ancestor[]): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  const map = new Map(ancestors.map(a => [a.id, a]));

  const currentYear = new Date().getFullYear();

  ancestors.forEach(person => {
    // 1. Death before Birth
    if (person.birthYear && person.deathYear && person.deathYear < person.birthYear) {
      anomalies.push({
        id: person.id,
        name: person.name,
        type: 'Error',
        message: `Death year (${person.deathYear}) is before birth year (${person.birthYear}).`
      });
    }

    // 2. Impossible Lifespan
    if (person.birthYear && person.deathYear && (person.deathYear - person.birthYear > 120)) {
      anomalies.push({
        id: person.id,
        name: person.name,
        type: 'Warning',
        message: `Recorded lifespan is ${person.deathYear - person.birthYear} years, which is highly unusual.`
      });
    }

    // 3. Implied Deceased but no Death Year (born > 110 years ago)
    if (person.birthYear && !person.deathYear && (currentYear - person.birthYear > 110)) {
      anomalies.push({
        id: person.id,
        name: person.name,
        type: 'Warning',
        message: `Born in ${person.birthYear} (110+ years ago) but no death year recorded.`
      });
    }

    // 4. Parent Logic
    if (person.fatherId) {
      const father = map.get(person.fatherId);
      if (father && father.birthYear && person.birthYear) {
        if (father.birthYear >= person.birthYear) {
          anomalies.push({
             id: person.id,
             name: person.name,
             type: 'Error',
             message: `Father (${father.name}) born in ${father.birthYear}, same or after child (${person.birthYear}).`
          });
        } else if (person.birthYear - father.birthYear < 12) {
           anomalies.push({
             id: person.id,
             name: person.name,
             type: 'Warning',
             message: `Father (${father.name}) was only ${person.birthYear - father.birthYear} when child was born.`
          });
        }
      }
    }

    if (person.motherId) {
      const mother = map.get(person.motherId);
      if (mother && mother.birthYear && person.birthYear) {
        if (mother.birthYear >= person.birthYear) {
          anomalies.push({
             id: person.id,
             name: person.name,
             type: 'Error',
             message: `Mother (${mother.name}) born in ${mother.birthYear}, same or after child (${person.birthYear}).`
          });
        } else if (person.birthYear - mother.birthYear < 12) {
           anomalies.push({
             id: person.id,
             name: person.name,
             type: 'Warning',
             message: `Mother (${mother.name}) was only ${person.birthYear - mother.birthYear} when child was born.`
          });
        } else if (person.birthYear - mother.birthYear > 65) {
            anomalies.push({
                id: person.id,
                name: person.name,
                type: 'Warning',
                message: `Mother (${mother.name}) was ${person.birthYear - mother.birthYear} when child was born (unusually old).`
             });
        }
      }
    }
  });

  return anomalies;
};