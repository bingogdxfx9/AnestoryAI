import React, { useState, useRef } from 'react';
import { Ancestor } from '../types';
import { parseGEDCOM, parseCSVLines, convertCSVToAncestors, CsvMapping } from '../utils/importers';
import { StorageService } from '../services/storage';

interface Props {
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'upload' | 'map-csv' | 'review' | 'processing';

export const ImportWizard: React.FC<Props> = ({ onClose, onImportComplete }) => {
  const [step, setStep] = useState<Step>('upload');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileType, setFileType] = useState<'ged' | 'csv' | null>(null);
  const [fileName, setFileName] = useState<string>('');
  
  // CSV State
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<CsvMapping>({
    nameIndex: -1,
    birthIndex: -1,
    deathIndex: -1,
    genderIndex: -1,
    fatherIndex: -1,
    motherIndex: -1
  });

  // Parsed Data
  const [parsedAncestors, setParsedAncestors] = useState<Ancestor[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const extension = file.name.split('.').pop()?.toLowerCase();

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setFileContent(content);

      if (extension === 'ged') {
        setFileType('ged');
        const data = parseGEDCOM(content);
        setParsedAncestors(data);
        setStep('review');
      } else if (extension === 'csv') {
        setFileType('csv');
        const rows = parseCSVLines(content);
        if (rows.length > 0) {
            setCsvHeaders(rows[0]); // Assume first row is header
            setCsvRows(rows.slice(1));
            setStep('map-csv');
        } else {
            alert("CSV appears empty.");
        }
      } else {
        alert("Unsupported file type. Please upload .ged or .csv");
      }
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (field: keyof CsvMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: parseInt(value) }));
  };

  const handleCsvContinue = () => {
    if (mapping.nameIndex === -1) {
        alert("Please map at least the Name column.");
        return;
    }
    const data = convertCSVToAncestors(csvRows, mapping);
    setParsedAncestors(data);
    setStep('review');
  };

  const executeImport = () => {
    setStep('processing');
    
    // 1. Generate ID Map to ensure new unique IDs
    const idMap = new Map<string, string>(); // OldId -> NewUUID
    parsedAncestors.forEach(a => {
        idMap.set(a.id, crypto.randomUUID());
    });

    // 2. Remap ancestors with new IDs
    const finalAncestors = parsedAncestors.map(a => ({
        ...a,
        id: idMap.get(a.id)!, // Must exist
        fatherId: a.fatherId ? idMap.get(a.fatherId) || null : null,
        motherId: a.motherId ? idMap.get(a.motherId) || null : null,
    }));

    // 3. Save to storage
    // We loop and add, StorageService normally generates IDs, but we pre-generated to maintain links.
    // We need to bypass StorageService.add's ID generation or update StorageService to accept bulk with IDs.
    // For this app's simple StorageService (LocalStorage), we can just pull, concat, push.
    
    // We'll mimic StorageService logic manually here for bulk efficiency:
    const current = StorageService.getAll();
    const updated = [...current, ...finalAncestors];
    localStorage.setItem('ancestry_app_data', JSON.stringify(updated));

    setTimeout(() => {
        onImportComplete();
        onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-slate-800 p-6">
            <h2 className="text-2xl font-bold text-white">Import Data Wizard</h2>
            <p className="text-slate-400 text-sm">Upload GEDCOM or CSV to grow your tree.</p>
        </div>

        <div className="p-8 flex-grow overflow-y-auto">
            
            {/* STEP 1: UPLOAD */}
            {step === 'upload' && (
                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
                     onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" accept=".ged,.csv" className="hidden" onChange={handleFileChange} />
                    <span className="text-6xl mb-4">📂</span>
                    <p className="text-lg font-medium text-slate-700">Click to upload .GED or .CSV</p>
                    <p className="text-sm text-slate-400 mt-2">Supports GEDCOM 5.5+ and standard CSV</p>
                </div>
            )}

            {/* STEP 2: MAP CSV */}
            {step === 'map-csv' && (
                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-slate-800">Map CSV Columns</h3>
                    <p className="text-sm text-slate-500 mb-4">Select which column corresponds to each field.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                            { label: 'Full Name (Required)', field: 'nameIndex' },
                            { label: 'Birth Date/Year', field: 'birthIndex' },
                            { label: 'Death Date/Year', field: 'deathIndex' },
                            { label: 'Gender', field: 'genderIndex' },
                            { label: 'Father Name', field: 'fatherIndex' },
                            { label: 'Mother Name', field: 'motherIndex' },
                        ].map((item) => (
                            <div key={item.field}>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{item.label}</label>
                                <select 
                                    className="w-full border p-2 rounded"
                                    onChange={(e) => handleMappingChange(item.field as keyof CsvMapping, e.target.value)}
                                    defaultValue={-1}
                                >
                                    <option value={-1}>-- Ignore --</option>
                                    {csvHeaders.map((h, i) => (
                                        <option key={i} value={i}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4">
                         <button onClick={handleCsvContinue} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700">Next</button>
                    </div>
                </div>
            )}

            {/* STEP 3: REVIEW */}
            {step === 'review' && (
                <div className="text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="bg-emerald-100 p-6 rounded-full">
                            <span className="text-4xl">📊</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Ready to Import</h3>
                        <p className="text-slate-500">
                            Found <strong className="text-indigo-600">{parsedAncestors.length}</strong> records in <strong>{fileName}</strong>.
                        </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded text-left max-h-40 overflow-y-auto text-sm border border-slate-200">
                        <p className="font-bold mb-2 text-slate-600">Preview (First 5):</p>
                        <ul className="space-y-1">
                            {parsedAncestors.slice(0, 5).map((a, i) => (
                                <li key={i} className="flex justify-between">
                                    <span>{a.name}</span>
                                    <span className="text-slate-400">{a.birthYear || '?'} - {a.deathYear || '?'}</span>
                                </li>
                            ))}
                            {parsedAncestors.length > 5 && <li className="text-slate-400 italic">...and {parsedAncestors.length - 5} more.</li>}
                        </ul>
                    </div>

                    <div className="flex justify-center gap-4 pt-4">
                        <button onClick={() => { setStep('upload'); setParsedAncestors([]); }} className="px-4 py-2 text-slate-500 hover:text-slate-700">Back</button>
                        <button onClick={executeImport} className="bg-emerald-600 text-white px-8 py-2 rounded font-bold hover:bg-emerald-700 shadow-lg">
                            Import Records
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: PROCESSING */}
            {step === 'processing' && (
                <div className="flex flex-col items-center justify-center py-12">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                     <p className="text-lg font-bold text-slate-700">Importing Data...</p>
                </div>
            )}

        </div>
        
        <div className="bg-slate-50 p-4 border-t flex justify-between items-center">
             <span className="text-xs text-slate-400">Step: {step}</span>
             {step !== 'processing' && <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>}
        </div>

      </div>
    </div>
  );
};