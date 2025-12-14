import React, { useEffect, useRef, useState } from 'react';
import { select, scaleBand, max, scaleLinear, axisBottom, axisLeft } from 'd3';
import { Ancestor } from '../types';
import { getLifespanDistribution, getAverageGenerationSpan, findPotentialDuplicates, findLocalAnomalies, Anomaly } from '../utils/genealogy';
import { getPredictiveAnalysis, PredictionResult } from '../services/geminiService';

interface Props {
  ancestors: Ancestor[];
  onUpdateAncestor?: (id: string, updates: Partial<Ancestor>) => void;
}

export const AnalyticsDashboard: React.FC<Props> = ({ ancestors, onUpdateAncestor }) => {
  const histogramRef = useRef<SVGSVGElement>(null);
  
  const duplicates = findPotentialDuplicates(ancestors);
  const avgGenSpan = getAverageGenerationSpan(ancestors);
  const lifespanData = getLifespanDistribution(ancestors);
  const localAnomalies = findLocalAnomalies(ancestors);

  const [aiPredictions, setAiPredictions] = useState<PredictionResult[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (!histogramRef.current || lifespanData.length === 0) return;

    // Clear prev
    select(histogramRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = histogramRef.current.clientWidth - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    const svg = select(histogramRef.current)
        .attr("height", 250)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Scale
    const x = scaleBand()
        .range([0, width])
        .domain(lifespanData.map(d => d.label))
        .padding(0.2);

    // Y Scale
    const maxCount = max(lifespanData, d => d.count) || 5;
    const y = scaleLinear()
        .domain([0, maxCount])
        .range([height, 0]);

    // Bars
    svg.selectAll("rect")
        .data(lifespanData)
        .enter()
        .append("rect")
        .attr("x", d => x(d.label)!)
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.count))
        .attr("fill", "#6366f1") // Indigo-500
        .attr("rx", 4);

    // X Axis
    const xAxisGroup = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(axisBottom(x));
    
    // Y Axis
    const yAxisGroup = svg.append("g")
        .call(axisLeft(y).ticks(5));
    
    // Gridlines
    svg.append("g")
        .attr("class", "grid")
        .call(axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ""))
        .attr("stroke-opacity", 0.1)
        .attr("class", "stroke-slate-300 dark:stroke-slate-600");

    // Styling Axes Text with Tailwind Classes manually using class attr
    xAxisGroup.selectAll("text").attr("class", "fill-slate-500 dark:fill-slate-400");
    yAxisGroup.selectAll("text").attr("class", "fill-slate-500 dark:fill-slate-400");
    xAxisGroup.selectAll("path, line").attr("class", "stroke-slate-300 dark:stroke-slate-600");
    yAxisGroup.selectAll("path, line").attr("class", "stroke-slate-300 dark:stroke-slate-600");


  }, [lifespanData]);

  const runPredictiveCheck = async () => {
    setLoadingAi(true);
    const results = await getPredictiveAnalysis(ancestors);
    setAiPredictions(results);
    setLoadingAi(false);
  };

  const handleApplyPrediction = (pred: PredictionResult) => {
    if (onUpdateAncestor) {
        onUpdateAncestor(pred.ancestorId, { [pred.field]: pred.predictedValue });
        // Remove applied prediction
        setAiPredictions(prev => prev.filter(p => p !== pred));
    }
  };

  return (
    <div className="space-y-6">
        {/* Data Quality Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {duplicates.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 p-4 rounded shadow-sm">
                    <h4 className="font-bold text-amber-800 dark:text-amber-200 text-sm flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Potential Duplicates
                    </h4>
                    <ul className="mt-2 text-xs text-amber-700 dark:text-amber-300 list-disc list-inside">
                        {duplicates.map((group, idx) => (
                            <li key={idx}>
                                <strong>{group[0].name}</strong> ({group[0].birthYear}) - Found {group.length}.
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {localAnomalies.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded shadow-sm">
                    <h4 className="font-bold text-red-800 dark:text-red-200 text-sm flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Logic Anomalies (Local)
                    </h4>
                    <ul className="mt-2 text-xs text-red-700 dark:text-red-300 list-disc list-inside max-h-32 overflow-y-auto">
                        {localAnomalies.map((anom, idx) => (
                            <li key={idx}>
                                <strong>{anom.name}:</strong> {anom.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>

        {/* Predictive & Consistency AI Tool */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 transition-colors">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                     <span className="mr-2">🔎</span> Predictive Gap Filler & Consistency Checker
                 </h3>
                 <button 
                    onClick={runPredictiveCheck}
                    disabled={loadingAi}
                    className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 transition disabled:bg-indigo-300"
                 >
                    {loadingAi ? 'Analyzing Tree...' : 'Run AI Analysis'}
                 </button>
             </div>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                 Uses AI and historical grounding to find gaps, suggest dates, and identify anomalies.
             </p>

             {aiPredictions.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {aiPredictions.map((pred, i) => {
                         const person = ancestors.find(a => a.id === pred.ancestorId);
                         const isAnomaly = pred.type === 'Anomaly';
                         return (
                            <div key={i} className={`border p-3 rounded-lg flex flex-col justify-between ${
                                isAnomaly 
                                ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800' 
                                : 'border-indigo-100 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-800'
                            }`}>
                                <div>
                                    <div className="flex justify-between">
                                        <p className={`font-bold text-sm ${isAnomaly ? 'text-red-900 dark:text-red-200' : 'text-indigo-900 dark:text-indigo-200'}`}>
                                            {person?.name || 'Unknown'}
                                        </p>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                            isAnomaly ? 'bg-red-200 text-red-800' : 'bg-indigo-200 text-indigo-800'
                                        }`}>
                                            {pred.type}
                                        </span>
                                    </div>
                                    <p className={`text-xs mt-1 ${isAnomaly ? 'text-red-700 dark:text-red-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
                                        {isAnomaly ? 'Anomaly in ' : 'Missing '} <strong>{pred.field}</strong>.
                                        {isAnomaly && pred.currentValue && <span className="block">Current: {pred.currentValue}</span>}
                                        <span className="block mt-1">Suggested: <span className="font-mono bg-white dark:bg-slate-900 px-1 rounded">{pred.predictedValue}</span></span>
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">"{pred.reasoning}"</p>
                                </div>
                                <button 
                                    onClick={() => handleApplyPrediction(pred)}
                                    className={`mt-3 w-full py-1 text-xs font-bold rounded border transition ${
                                        isAnomaly
                                        ? 'bg-white border-red-200 text-red-600 hover:bg-red-100 dark:bg-slate-800 dark:border-red-900 dark:text-red-300'
                                        : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-100 dark:bg-slate-800 dark:border-indigo-600 dark:text-indigo-300'
                                    }`}
                                >
                                    Apply Correction
                                </button>
                            </div>
                         )
                     })}
                 </div>
             ) : (
                 !loadingAi && <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm border-2 border-dashed border-slate-100 dark:border-slate-700 rounded">No active predictions. Run the check to analyze.</div>
             )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lifespan Histogram */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 transition-colors">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide">Lifespan Distribution</h3>
                <svg ref={histogramRef} className="w-full block"></svg>
            </div>

            {/* Generation Time Map */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center text-center transition-colors">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Avg Generation Gap</h3>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-full w-32 h-32 flex items-center justify-center border-4 border-emerald-100 dark:border-emerald-800 mb-3">
                    <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{avgGenSpan ? avgGenSpan : '--'}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Years between Parent & Child</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 max-w-xs">
                    Calculated from the average age difference between parents and their children across the entire family tree.
                </p>
            </div>
        </div>
    </div>
  );
};