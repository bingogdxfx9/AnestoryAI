import React, { useState, useEffect } from 'react';
import { Ancestor, AncestorFormData } from '../types';
import { hasCircularReference } from '../utils/genealogy';

interface Props {
  ancestors: Ancestor[];
  editingId: string | null;
  prefillData?: any; // Data from AI Scrutinizer
  onSave: (data: AncestorFormData) => void;
  onCancel: () => void;
}

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Ireland", "Germany", "France", "Italy", "Spain", "Mexico", 
  "China", "India", "Japan", "Brazil", "Russia", "South Africa", "Nigeria", "Egypt", "Kenya", "Ghana",
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Austria", "Bangladesh", "Belgium", 
  "Bolivia", "Bosnia and Herzegovina", "Bulgaria", "Cambodia", "Cameroon", "Chile", "Colombia", 
  "Costa Rica", "Croatia", "Cuba", "Czech Republic", "Denmark", "Dominican Republic", "Ecuador", 
  "El Salvador", "Ethiopia", "Finland", "Greece", "Guatemala", "Haiti", "Honduras", "Hungary", 
  "Iceland", "Indonesia", "Iran", "Iraq", "Israel", "Jamaica", "Jordan", "South Korea", "Lebanon", 
  "Lithuania", "Malaysia", "Morocco", "Netherlands", "New Zealand", "Norway", "Pakistan", "Peru", 
  "Philippines", "Poland", "Portugal", "Romania", "Saudi Arabia", "Serbia", "Singapore", "Slovakia", 
  "Slovenia", "Sweden", "Switzerland", "Syria", "Taiwan", "Thailand", "Turkey", "Ukraine", 
  "United Arab Emirates", "Vietnam", "Zimbabwe"
];

const initialForm: AncestorFormData = {
  name: '',
  birthYear: '',
  deathYear: '',
  gender: 'Unknown',
  country: '',
  fatherId: '',
  motherId: '',
  notes: ''
};

export const AncestorForm: React.FC<Props> = ({ ancestors, editingId, prefillData, onSave, onCancel }) => {
  const [form, setForm] = useState<AncestorFormData>(initialForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingId) {
      // EDIT MODE
      const existing = ancestors.find(a => a.id === editingId);
      if (existing) {
        setForm({
          name: existing.name,
          birthYear: existing.birthYear?.toString() || '',
          deathYear: existing.deathYear?.toString() || '',
          gender: existing.gender,
          country: existing.country || '',
          fatherId: existing.fatherId || '',
          motherId: existing.motherId || '',
          notes: existing.notes
        });
      }
    } else if (prefillData) {
      // AI SMART ADD MODE
      // Try to match parents by name
      let foundFatherId = '';
      let foundMotherId = '';

      if (prefillData.fatherName) {
        const match = ancestors.find(a => a.name.toLowerCase() === prefillData.fatherName.toLowerCase());
        if (match) foundFatherId = match.id;
      }
      
      if (prefillData.motherName) {
        const match = ancestors.find(a => a.name.toLowerCase() === prefillData.motherName.toLowerCase());
        if (match) foundMotherId = match.id;
      }

      setForm({
        name: prefillData.name || '',
        birthYear: prefillData.birthYear || '',
        deathYear: prefillData.deathYear || '',
        gender: prefillData.gender || 'Unknown',
        country: prefillData.country || '',
        fatherId: foundFatherId,
        motherId: foundMotherId,
        notes: prefillData.notes || ''
      });
    } else {
      // NEW BLANK MODE
      setForm(initialForm);
    }
  }, [editingId, ancestors, prefillData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Circular Check
    if (editingId) {
      if (form.fatherId && hasCircularReference(ancestors, editingId, form.fatherId)) {
        setError("Circular reference detected! This person cannot be their own ancestor via the selected Father.");
        return;
      }
      if (form.motherId && hasCircularReference(ancestors, editingId, form.motherId)) {
        setError("Circular reference detected! This person cannot be their own ancestor via the selected Mother.");
        return;
      }
    }

    onSave(form);
  };

  // Filter potential parents: Can't be self.
  const eligibleParents = ancestors.filter(a => a.id !== editingId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="bg-indigo-600 p-4">
          <h2 className="text-white text-xl font-bold">
            {editingId ? 'Edit Ancestor' : (prefillData ? 'Review AI Extracted Data' : 'Add New Ancestor')}
          </h2>
          {prefillData && <p className="text-indigo-200 text-xs">Please verify the AI suggestions below.</p>}
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 text-red-700 dark:text-red-200 text-sm">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Birth Year</label>
              <input
                type="number"
                name="birthYear"
                value={form.birthYear}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Death Year</label>
              <input
                type="number"
                name="deathYear"
                value={form.deathYear}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              >
                <option value="Unknown">Unknown</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Country</label>
              <select
                name="country"
                value={form.country}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
              >
                <option value="">-- Select Country --</option>
                {COUNTRIES.sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Father</label>
              <select
                name="fatherId"
                value={form.fatherId}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${prefillData && form.fatherId ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300' : 'border-slate-300 dark:border-slate-600'}`}
              >
                <option value="">-- None / Unknown --</option>
                {eligibleParents
                  .filter(p => p.gender === 'Male' || p.gender === 'Unknown')
                  .map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.birthYear || '?'})</option>
                ))}
              </select>
              {prefillData && !form.fatherId && prefillData.fatherName && (
                  <p className="text-xs text-amber-600 mt-1">AI suggestion: "{prefillData.fatherName}" (No match found)</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mother</label>
              <select
                name="motherId"
                value={form.motherId}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${prefillData && form.motherId ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300' : 'border-slate-300 dark:border-slate-600'}`}
              >
                <option value="">-- None / Unknown --</option>
                {eligibleParents
                  .filter(p => p.gender === 'Female' || p.gender === 'Unknown')
                  .map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.birthYear || '?'})</option>
                ))}
              </select>
              {prefillData && !form.motherId && prefillData.motherName && (
                  <p className="text-xs text-amber-600 mt-1">AI suggestion: "{prefillData.motherName}" (No match found)</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
            <textarea
              name="notes"
              rows={4}
              value={form.notes}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition shadow-md"
            >
              {prefillData ? 'Confirm & Save' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};