import { Ancestor, Gender } from '../types';

// Helper to extract a 4-digit year from a date string
export const extractYear = (dateStr: string | undefined | null): number | null => {
  if (!dateStr) return null;
  const match = dateStr.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
};

// Helper to normalize gender string
export const normalizeGender = (g: string | undefined): Gender => {
  if (!g) return 'Unknown';
  const lower = g.toLowerCase();
  if (lower.startsWith('m')) return 'Male';
  if (lower.startsWith('f')) return 'Female';
  return 'Unknown';
};

// --- GEDCOM PARSER ---

interface GedcomIndi {
  id: string;
  name: string;
  sex: string;
  birthDate?: string;
  deathDate?: string;
  famc?: string; // Family where they are a child
  fams?: string[]; // Families where they are a spouse
}

interface GedcomFam {
  id: string;
  husb?: string;
  wife?: string;
  children: string[];
}

export const parseGEDCOM = (content: string): Ancestor[] => {
  const lines = content.split(/\r?\n/);
  const indis: Map<string, GedcomIndi> = new Map();
  const fams: Map<string, GedcomFam> = new Map();

  let currentIndi: GedcomIndi | null = null;
  let currentFam: GedcomFam | null = null;
  let currentTag = '';

  // Basic line-based parser
  for (const line of lines) {
    const parts = line.trim().split(' ');
    if (parts.length < 2) continue;

    const level = parts[0];
    const tagOrId = parts[1];
    const value = parts.slice(2).join(' ');

    if (level === '0') {
      // Start record
      if (value === 'INDI' || parts[2] === 'INDI') {
        const id = tagOrId.replace(/@/g, ''); // Remove @ delimiters
        currentIndi = { id, name: 'Unknown', sex: 'U', fams: [] };
        currentFam = null;
        indis.set(id, currentIndi);
      } else if (value === 'FAM' || parts[2] === 'FAM') {
        const id = tagOrId.replace(/@/g, '');
        currentFam = { id, children: [] };
        currentIndi = null;
        fams.set(id, currentFam);
      } else {
        currentIndi = null;
        currentFam = null;
      }
    } else if (currentIndi) {
        // Individual properties
        if (tagOrId === 'NAME') currentIndi.name = value.replace(/\//g, '');
        else if (tagOrId === 'SEX') currentIndi.sex = value;
        else if (tagOrId === 'BIRT') currentTag = 'BIRT';
        else if (tagOrId === 'DEAT') currentTag = 'DEAT';
        else if (tagOrId === 'DATE') {
            if (currentTag === 'BIRT') currentIndi.birthDate = value;
            if (currentTag === 'DEAT') currentIndi.deathDate = value;
        }
        else if (tagOrId === 'FAMC') currentIndi.famc = value.replace(/@/g, '');
        else if (tagOrId === 'FAMS') currentIndi.fams?.push(value.replace(/@/g, ''));
    } else if (currentFam) {
        // Family properties
        if (tagOrId === 'HUSB') currentFam.husb = value.replace(/@/g, '');
        else if (tagOrId === 'WIFE') currentFam.wife = value.replace(/@/g, '');
        else if (tagOrId === 'CHIL') currentFam.children.push(value.replace(/@/g, ''));
    }
  }

  // Convert to Ancestor objects
  // We need to generate new UUIDs to avoid collision with existing app data, 
  // but we must maintain internal consistency first.
  
  // 1. Map old IDs to temp objects
  const ancestors: Ancestor[] = [];
  const idMap = new Map<string, string>(); // GedcomID -> NewUUID (will be generated in Wizard, here we keep GEDCOM ID for linking then let wizard re-map)
  
  // Actually, let's keep it simple: Return objects with GEDCOM IDs as 'id'. 
  // The Wizard will handle ID collision remapping during the import phase.

  indis.forEach(indi => {
    // Find parents
    let fatherId: string | null = null;
    let motherId: string | null = null;

    if (indi.famc) {
        const fam = fams.get(indi.famc);
        if (fam) {
            if (fam.husb) fatherId = fam.husb;
            if (fam.wife) motherId = fam.wife;
        }
    }

    ancestors.push({
        id: indi.id, // Temporary ID, internal to file
        name: indi.name,
        birthYear: extractYear(indi.birthDate),
        deathYear: extractYear(indi.deathDate),
        gender: normalizeGender(indi.sex),
        fatherId: fatherId,
        motherId: motherId,
        notes: `Imported from GEDCOM. Original ID: ${indi.id}`,
        dateAdded: Date.now()
    });
  });

  return ancestors;
};

// --- CSV PARSER ---

export const parseCSVLines = (content: string): string[][] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    return lines.map(line => {
        // Basic CSV split, respects quotes (simple version)
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        // Fallback if regex fails (simple split)
        if (!matches) return line.split(',').map(s => s.trim());
        return matches.map(m => m.replace(/^"|"$/g, '').trim());
    });
};

export interface CsvMapping {
    nameIndex: number;
    birthIndex: number;
    deathIndex: number;
    genderIndex: number;
    fatherIndex: number;
    motherIndex: number;
}

export const convertCSVToAncestors = (rows: string[][], mapping: CsvMapping): Ancestor[] => {
    // We generate temporary IDs for the rows to allow linking
    // Rows usually don't have IDs, so we assume Name based linking or Row Index ID
    
    const tempAncestors = rows.map((row, index) => {
        return {
            tempId: `row-${index}`,
            name: row[mapping.nameIndex] || 'Unknown',
            birthYear: extractYear(row[mapping.birthIndex]),
            deathYear: extractYear(row[mapping.deathIndex]),
            gender: normalizeGender(row[mapping.genderIndex]),
            fatherName: row[mapping.fatherIndex], // Store name temporarily
            motherName: row[mapping.motherIndex], // Store name temporarily
            notes: 'Imported from CSV'
        };
    });

    // Resolve Parents by Name (Simple fuzzy match within batch)
    // This is O(N^2), fine for small imports < 1000
    return tempAncestors.map(p => {
        let fatherId = null;
        let motherId = null;

        if (p.fatherName) {
            const match = tempAncestors.find(a => a.name.toLowerCase() === p.fatherName.toLowerCase());
            if (match) fatherId = match.tempId;
        }
        if (p.motherName) {
            const match = tempAncestors.find(a => a.name.toLowerCase() === p.motherName.toLowerCase());
            if (match) motherId = match.tempId;
        }

        return {
            id: p.tempId,
            name: p.name,
            birthYear: p.birthYear,
            deathYear: p.deathYear,
            gender: p.gender,
            fatherId,
            motherId,
            notes: p.notes,
            dateAdded: Date.now()
        };
    });
};