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
  const [progress, setProgress] = useState(0);
  
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
            setCsvHeaders(rows[0]); 
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

  const executeImport = async () => {
    setStep('processing');
    const total = parsedAncestors.length;
    let count = 0;
    
    for (const ancestor of parsedAncestors) {
        await StorageService.add({
            name: ancestor.name,
            birthYear: ancestor.birthYear,
            deathYear: ancestor.deathYear,
            gender: ancestor.gender,
            country: ancestor.country || null,
            fatherId: null,
            motherId: null,
            notes: ancestor.notes
        });
        count++;
        setProgress(Math.round((count/total) * 100));
        // Mock delay for visual effect
        await new Promise(r => setTimeout(r, 10));
    }

    setTimeout(() => {
        onImportComplete();
        onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-md">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
        
        <div className="bg-gradient-to-r from-surface to-background p-6 border-b border-white/5 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-white">Import Data</h2>
                <p className="text-gray-400 text-xs mt-1">GEDCOM 5.5+ or CSV</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
            </button>
        </div>

        <div className="p-8 flex-grow overflow-y-auto">
            
            {step === 'upload' && (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 hover:bg-white/10 transition cursor-pointer group"
                     onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" accept=".ged,.csv" className="hidden" onChange={handleFileChange} />
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition">
                         <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                    </div>
                    <p className="text-lg font-medium text-white">Click to upload file</p>
                    <p className="text-sm text-gray-500 mt-2">Drag and drop or browse</p>
                </div>
            )}

            {step === 'map-csv' && (
                <div className="space-y-4">
                     {/* Simplified mapping UI */}
                     <button onClick={() => setStep('review')} className="bg-primary text-white w-full py-3 rounded-xl font-bold">Continue (Mock)</button>
                </div>
            )}

            {step === 'review' && (
                <div className="text-center space-y-6">
                    <div className="bg-surface-light border border-white/5 rounded-xl p-4 text-left">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-white font-bold">{fileName}</span>
                             <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{parsedAncestors.length} Records</span>
                        </div>
                        <div className="h-1 w-full bg-background rounded-full overflow-hidden">
                             <div className="h-full bg-green-500 w-full"></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Ready to process. This may take a few moments.</p>
                    </div>

                    <button onClick={executeImport} className="bg-primary text-white w-full py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition">
                        Start Import
                    </button>
                </div>
            )}

            {step === 'processing' && (
                <div className="py-8">
                     <div className="flex justify-between text-xs text-gray-400 mb-2">
                         <span>Processing nodes...</span>
                         <span>{progress}%</span>
                     </div>
                     <div className="h-2 w-full bg-background rounded-full overflow-hidden mb-6">
                         <div className="h-full bg-primary transition-all duration-300" style={{width: `${progress}%`}}></div>
                     </div>
                     <p className="text-center text-white font-medium animate-pulse">Importing your family history...</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};