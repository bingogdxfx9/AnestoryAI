import React, { useState, useEffect, useRef } from 'react';
import { Ancestor } from '../types';
import { TreeVisualization } from './TreeVisualization';
import { ThreeView } from './ThreeView';
import { generateFamilyReport } from '../services/reportGenerator';

interface Props {
  ancestors: Ancestor[];
  onClose: () => void;
}

type Step = 'init' | 'capturing-tree' | 'capturing-3d' | 'generating-pdf' | 'done';

export const ReportGenerationModal: React.FC<Props> = ({ ancestors, onClose }) => {
  const [step, setStep] = useState<Step>('init');
  const [images, setImages] = useState<{tree?: string; three?: string}>({});
  
  // We use fixed-size containers to ensure consistent high-quality screenshots regardless of screen size
  const captureWidth = 1200;
  const captureHeight = 800;

  useEffect(() => {
    // Sequence the capture process
    let timeoutId: any;

    const sequence = async () => {
        if (step === 'init') {
            setStep('capturing-tree');
        } else if (step === 'capturing-tree') {
            // Give D3 time to animate/render
            timeoutId = setTimeout(() => {
                captureTree();
            }, 1500); 
        } else if (step === 'capturing-3d') {
            // Give WebGL time to load textures
            timeoutId = setTimeout(() => {
                captureThree();
            }, 2000);
        } else if (step === 'generating-pdf') {
            generateFamilyReport(ancestors, images);
            setStep('done');
            setTimeout(onClose, 1000);
        }
    };

    sequence();

    return () => clearTimeout(timeoutId);
  }, [step]);

  const captureTree = () => {
      const svgElement = document.querySelector('#report-tree-container svg') as SVGSVGElement;
      if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const canvas = document.createElement('canvas');
          canvas.width = captureWidth;
          canvas.height = captureHeight;
          const ctx = canvas.getContext('2d');
          const img = new Image();
          // Encode svg
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
          
          img.onload = () => {
              // Draw white background first (PDFs don't like transparent)
              if (ctx) {
                  ctx.fillStyle = '#0f172a'; // Match theme background or white
                  ctx.fillRect(0, 0, captureWidth, captureHeight);
                  ctx.drawImage(img, 0, 0);
                  setImages(prev => ({ ...prev, tree: canvas.toDataURL('image/png') }));
                  setStep('capturing-3d');
              }
          };
      } else {
          // Skip if fail
          setStep('capturing-3d');
      }
  };

  const captureThree = () => {
      const canvas = document.querySelector('#report-three-container canvas') as HTMLCanvasElement;
      if (canvas) {
          setImages(prev => ({ ...prev, three: canvas.toDataURL('image/png') }));
      }
      setStep('generating-pdf');
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
        <div className="text-center space-y-4 relative z-10 p-8 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30 animate-pulse">
                <span className="material-symbols-outlined text-3xl text-white">menu_book</span>
            </div>
            
            <h2 className="text-2xl font-bold text-white">Generating Family Book</h2>
            
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                    <span>Progress</span>
                    <span className="uppercase font-bold tracking-wider">{step.replace('-', ' ')}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500"
                        style={{
                            width: step === 'init' ? '5%' : 
                                   step === 'capturing-tree' ? '30%' : 
                                   step === 'capturing-3d' ? '60%' : 
                                   step === 'generating-pdf' ? '90%' : '100%'
                        }}
                    ></div>
                </div>
            </div>
            
            <p className="text-sm text-slate-500">
                {step === 'capturing-tree' && "Capturing high-res tree visualizations..."}
                {step === 'capturing-3d' && "Mapping global migration paths..."}
                {step === 'generating-pdf' && "Compiling pages and creating PDF..."}
                {step === 'done' && "Download starting!"}
            </p>
        </div>

        {/* HIDDEN CAPTURE CONTAINERS */}
        {/* We render them off-screen but visible to DOM for capture */}
        <div style={{ position: 'fixed', left: '-3000px', top: 0, opacity: 1, pointerEvents: 'none' }}>
            
            {/* Tree Container */}
            {step === 'capturing-tree' && (
                <div id="report-tree-container" style={{ width: captureWidth, height: captureHeight, background: '#0f172a' }}>
                    <TreeVisualization 
                        ancestors={ancestors} 
                        filteredIds={null} 
                        onSelectNode={() => {}} 
                    />
                </div>
            )}

            {/* 3D Container */}
            {/* Note: WebGL context needs to be created, so we mount it when needed */}
            {(step === 'capturing-tree' || step === 'capturing-3d') && (
                <div id="report-three-container" style={{ width: captureWidth, height: captureHeight, background: '#0f172a' }}>
                    <ThreeView 
                        ancestors={ancestors} 
                        onClose={() => {}}
                    />
                </div>
            )}
        </div>
    </div>
  );
};