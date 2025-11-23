import React, { useState, useRef } from 'react';
import { generateStylizedImage } from '../services/geminiService';

interface Props {
  onClose: () => void;
}

const STYLES = [
  { id: '1860s-tintype', label: '1860s Tintype', desc: 'Civil War era metallic photo', emoji: '🕰️' },
  { id: '1890s-victorian', label: '1890s Victorian', desc: 'Formal sepia portrait', emoji: '🎩' },
  { id: '1920s-gatsby', label: '1920s Gatsby', desc: 'High contrast, soft focus', emoji: '🥂' },
  { id: '1940s-noir', label: '1940s Noir', desc: 'Dramatic black & white', emoji: '🎬' },
  { id: '1950s-kodachrome', label: '1950s Color', desc: 'Vibrant, vintage color', emoji: '📺' },
  { id: '1970s-retro', label: '1970s Retro', desc: 'Warm, faded polaroid', emoji: '☮️' },
  { id: 'renaissance', label: 'Renaissance Oil', desc: 'Classic oil painting style', emoji: '🎨' },
  { id: 'marble-bust', label: 'Marble Bust', desc: 'Roman statue style', emoji: '🏛️' },
];

export const TimeTravelStudio: React.FC<Props> = ({ onClose }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLES[1].label);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setGeneratedImage(null); // Reset previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;
    setLoading(true);
    try {
      const result = await generateStylizedImage(selectedImage, selectedStyle);
      setGeneratedImage(result);
    } catch (err) {
      console.error(err);
      alert("Failed to generate image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `ancestor-time-travel-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-90 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-700 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <span className="mr-2">⏳</span> Time Travel Studio
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              Upload a modern photo and see it transformed into a historical portrait.
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:text-indigo-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          
          {/* Controls Panel */}
          <div className="w-full md:w-1/3 bg-slate-800 border-r border-slate-700 p-6 flex flex-col gap-6 overflow-y-auto">
            
            {/* Upload */}
            <div>
              <label className="block text-sm font-bold text-slate-400 uppercase mb-2">1. Upload Photo</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-700 hover:border-indigo-500 transition group"
              >
                {selectedImage ? (
                  <div className="relative">
                    <img src={selectedImage} alt="Preview" className="w-full h-32 object-cover rounded-lg mx-auto opacity-70 group-hover:opacity-100 transition" />
                    <p className="text-xs text-slate-300 mt-2">Click to change</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <svg className="w-10 h-10 text-slate-500 mb-2 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-slate-400 text-sm">Upload Face Photo</span>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>

            {/* Style Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-400 uppercase mb-2">2. Choose Era</label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.label)}
                    className={`p-2 rounded text-left transition flex flex-col border ${
                      selectedStyle === style.label 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <span className="text-lg">{style.emoji}</span>
                    <span className="text-xs font-bold mt-1">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action */}
            <button
              onClick={handleGenerate}
              disabled={!selectedImage || loading}
              className={`w-full py-3 rounded-lg font-bold shadow-lg transition transform active:scale-95 ${
                !selectedImage || loading
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600'
              }`}
            >
              {loading ? 'Traveling...' : 'Time Travel Now ✨'}
            </button>
          </div>

          {/* Results Area */}
          <div className="w-full md:w-2/3 bg-slate-900 p-6 flex flex-col items-center justify-center relative">
            
            {!generatedImage && !loading && (
              <div className="text-center text-slate-500 max-w-xs">
                <span className="text-6xl mb-4 block opacity-20">🎞️</span>
                <p>Select a photo and an era to generate a historical morph.</p>
              </div>
            )}

            {loading && (
              <div className="text-center">
                 <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-fuchsia-500 mx-auto mb-4"></div>
                 <p className="text-slate-300 animate-pulse">Consulting the time vortex...</p>
                 <p className="text-xs text-slate-500 mt-2">Generating image...</p>
              </div>
            )}

            {generatedImage && !loading && (
              <div className="w-full h-full flex flex-col animate-fade-in">
                <div className="flex-1 flex gap-4 items-center justify-center min-h-0">
                  {/* Original (Small) */}
                  <div className="relative group w-1/3 max-w-[200px]">
                    <img src={selectedImage!} alt="Original" className="w-full h-auto rounded-lg border-2 border-slate-600 opacity-60 group-hover:opacity-100 transition" />
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">Original</span>
                  </div>
                  
                  {/* Arrow */}
                  <div className="text-slate-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>

                  {/* Generated (Large) */}
                  <div className="relative w-1/2 max-w-[400px]">
                    <img src={generatedImage} alt="Generated" className="w-full h-auto rounded-lg border-4 border-fuchsia-500 shadow-2xl shadow-fuchsia-900/50" />
                     <span className="absolute bottom-2 left-2 bg-fuchsia-600 text-white text-xs px-2 py-1 rounded font-bold shadow">{selectedStyle}</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                   <button 
                     onClick={downloadImage}
                     className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-full flex items-center transition"
                   >
                     <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                     Download Souvenir
                   </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};