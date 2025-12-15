import React, { useEffect, useRef, useState } from 'react';
import { 
  select, 
  zoom, 
  zoomIdentity, 
  hierarchy, 
  tree, 
  linkVertical,
  zoomTransform
} from 'd3';
import { Ancestor } from '../types';

interface TreeProps {
  ancestors: Ancestor[];
  filteredIds: string[] | null;
  onSelectNode: (id: string) => void;
}

export const TreeVisualization: React.FC<TreeProps> = ({ ancestors, filteredIds, onSelectNode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<any>(null); // Store d3 zoom behavior
  const gRef = useRef<any>(null); // Store the main group selection

  const [lineageMode, setLineageMode] = useState(true);
  const [highlightedIds, setHighlightedIds] = useState<Set<string> | null>(null);
  const [selectedNode, setSelectedNode] = useState<Ancestor | null>(null);

  // --- DRAWING EFFECT ---
  // Re-runs only when data structure (ancestors) or lineage toggle changes.
  useEffect(() => {
    if (!ancestors.length || !svgRef.current || !wrapperRef.current) return;

    const width = wrapperRef.current.clientWidth;
    const height = wrapperRef.current.clientHeight || 800;
    
    // Save current transform if it exists
    let currentTransform = zoomIdentity.translate(width/2, 50).scale(0.8);
    if (svgRef.current) {
        const t = zoomTransform(svgRef.current);
        if (t.k !== 1 || t.x !== 0 || t.y !== 0) currentTransform = t;
    }

    // Clear previous
    select(svgRef.current).selectAll("*").remove();

    const svg = select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("background", "transparent");

    const g = svg.append("g");
    gRef.current = g;

    // Zoom setup
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior as any);
    
    // Restore or Init Transform
    // If it was the very first render, currentTransform is the default.
    // If re-render, it's the preserved one.
    svg.call(zoomBehavior.transform as any, currentTransform);

    // Data Prep
    const roots = ancestors.filter(a => !a.fatherId && !a.motherId);
    const rootAncestor = roots.length > 0 ? roots[0] : ancestors[0];

    if (!rootAncestor) return;

    const buildTree = (personId: string): any => {
      const person = ancestors.find(a => a.id === personId);
      if (!person) return null;
      const children = ancestors
        .filter(a => a.fatherId === personId || a.motherId === personId)
        .map(child => buildTree(child.id))
        .filter(Boolean);
      return { ...person, children: children.length ? children : undefined };
    };

    const treeData = buildTree(rootAncestor.id);
    const rootHierarchy = hierarchy(treeData);
    
    // Layout
    const nodeWidth = 200;
    const nodeHeight = 100;
    const treeLayout = tree().nodeSize([nodeWidth + 40, nodeHeight + 80]);
    const root = treeLayout(rootHierarchy as any);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link") // Changed class for selection
      .attr("fill", "none")
      .attr("stroke", "#475569")
      .attr("stroke-width", 1.5)
      .attr("d", linkVertical()
        .x((d: any) => d.x)
        .y((d: any) => d.y) as any
      );

    // Lineage Dots
    if (lineageMode) {
        g.selectAll(".lineage-dot")
           .data(root.links())
           .enter()
           .append("circle")
           .attr("class", "lineage-dot")
           .attr("cx", (d: any) => (d.source.x + d.target.x) / 2)
           .attr("cy", (d: any) => (d.source.y + d.target.y) / 2)
           .attr("r", 4)
           .attr("fill", (d: any) => {
               const parent = d.source.data;
               return parent.gender === 'Male' ? '#14b8a6' : '#ec4899';
           })
           .attr("stroke", "#0f172a")
           .attr("stroke-width", 2);
    }

    // Nodes
    const nodes = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node cursor-pointer")
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
      .on("click", (e, d: any) => {
          e.stopPropagation();
          // INTERACTIVE HIGHLIGHT LOGIC
          const related = new Set<string>();
          // Ancestors (Up)
          d.ancestors().forEach((n: any) => related.add(n.data.id));
          // Descendants (Down)
          d.descendants().forEach((n: any) => related.add(n.data.id));
          
          setHighlightedIds(related);
          setSelectedNode(d.data);
      })
      .on("dblclick", (e, d: any) => {
          e.stopPropagation();
          onSelectNode(d.data.id);
      });

    // Node Visuals...
    nodes.append("rect")
      .attr("x", -80).attr("y", 0).attr("width", 160).attr("height", 80).attr("rx", 16)
      .attr("fill", "#1e293b")
      .attr("stroke", "rgba(255,255,255,0.1)").attr("stroke-width", 1)
      .style("filter", "drop-shadow(0 4px 6px rgba(0,0,0,0.3))");

    // Gender Indicator
    nodes.append("rect")
       .attr("x", -15).attr("y", -6).attr("width", 30).attr("height", 6).attr("rx", 3)
       .attr("fill", (d: any) => d.data.gender === 'Male' ? '#14b8a6' : '#ec4899');

    // Avatar
    nodes.append("clipPath").attr("id", (d: any) => `clip-${d.data.id}`)
      .append("circle").attr("cx", 0).attr("cy", 0).attr("r", 24);
    
    nodes.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 26)
      .attr("fill", "#1e293b").attr("stroke", "rgba(255,255,255,0.1)").attr("stroke-width", 1);

    nodes.each(function(d: any) {
        const gNode = select(this);
        if (d.data.photoUrl) {
            gNode.append("image")
                .attr("xlink:href", d.data.photoUrl)
                .attr("x", -24).attr("y", -24).attr("width", 48).attr("height", 48)
                .attr("clip-path", `url(#clip-${d.data.id})`).attr("preserveAspectRatio", "xMidYMid slice");
        } else {
             gNode.append("text").attr("y", 8).attr("text-anchor", "middle")
                .style("font-family", "Inter").style("font-weight", "bold").style("fill", "#64748b").style("font-size", "18px")
                .text(d.data.name.charAt(0));
        }
    });

    // Text
    nodes.append("text").attr("dy", 45).attr("text-anchor", "middle")
      .style("font-family", "Inter").style("font-weight", "600").style("fill", "#fff").style("font-size", "12px")
      .text((d: any) => d.data.name.length > 18 ? d.data.name.substring(0,16)+'...' : d.data.name);

    nodes.append("text").attr("dy", 62).attr("text-anchor", "middle")
      .style("font-family", "Inter").style("fill", "#94a3b8").style("font-size", "10px")
      .text((d: any) => `${d.data.birthYear || '?'} - ${d.data.deathYear || ''}`);

  }, [ancestors, lineageMode]); // Redraw only if data or layout mode changes

  // --- STYLING EFFECT ---
  // Updates styles without removing nodes, preserving zoom state
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);

    // Update Nodes
    svg.selectAll(".node")
       .transition().duration(300)
       .attr("opacity", (d: any) => {
           if (highlightedIds) {
               return highlightedIds.has(d.data.id) ? 1 : 0.1;
           }
           return filteredIds && !filteredIds.includes(d.data.id) ? 0.3 : 1;
       });
    
    // Update Node Stroke (Highlight)
    svg.selectAll(".node rect")
       .transition().duration(300)
       .attr("stroke", (d: any) => {
           if (highlightedIds && highlightedIds.has(d.data.id)) return "#f59e0b"; // Highlight color
           if (filteredIds && filteredIds.includes(d.data.id)) return "#2563EB";
           return "rgba(255,255,255,0.1)";
       })
       .attr("stroke-width", (d: any) => {
           if (highlightedIds && highlightedIds.has(d.data.id)) return 3;
           if (filteredIds && filteredIds.includes(d.data.id)) return 2;
           return 1;
       });

    // Update Links
    svg.selectAll(".link")
       .transition().duration(300)
       .attr("stroke", (d: any) => {
           if (highlightedIds) {
               const s = highlightedIds.has(d.source.data.id);
               const t = highlightedIds.has(d.target.data.id);
               return (s && t) ? "#f59e0b" : "#475569";
           }
           return "#475569";
       })
       .attr("stroke-opacity", (d: any) => {
           if (highlightedIds) {
               const s = highlightedIds.has(d.source.data.id);
               const t = highlightedIds.has(d.target.data.id);
               return (s && t) ? 1 : 0.05;
           }
           return 0.6;
       })
       .attr("stroke-width", (d: any) => {
           if (highlightedIds) {
               const s = highlightedIds.has(d.source.data.id);
               const t = highlightedIds.has(d.target.data.id);
               return (s && t) ? 3 : 1.5;
           }
           return 1.5;
       });
       
     // Lineage dots opacity
     svg.selectAll(".lineage-dot")
        .transition().duration(300)
        .attr("opacity", (d: any) => {
            if (highlightedIds) {
               const s = highlightedIds.has(d.source.data.id);
               const t = highlightedIds.has(d.target.data.id);
               return (s && t) ? 1 : 0.05;
           }
           return 1;
        });

  }, [highlightedIds, filteredIds, ancestors]);

  // --- CONTROLS ---
  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handlePan = (dx: number, dy: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.translateBy, dx, dy);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current || !wrapperRef.current) return;
    const width = wrapperRef.current.clientWidth;
    select(svgRef.current).transition().duration(750)
      .call(zoomBehaviorRef.current.transform, zoomIdentity.translate(width/2, 50).scale(0.8));
  };

  const handleBackgroundClick = () => {
      setHighlightedIds(null);
      setSelectedNode(null);
  };

  return (
    <div className="relative w-full h-full bg-background overflow-hidden animate-fade-in" onClick={handleBackgroundClick}>
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        </div>
        
        {/* Legend Controls */}
        <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
            <div className="bg-surface/90 backdrop-blur border border-white/10 rounded-xl p-3 shadow-xl flex flex-col gap-2.5 w-36">
                <div className="flex justify-between items-center pb-1 border-b border-white/5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Lineage</p>
                    <span className="material-symbols-outlined text-[14px] text-gray-500">info</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]"></div>
                    <span className="text-[11px] font-medium text-gray-300">Paternal</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]"></div>
                    <span className="text-[11px] font-medium text-gray-300">Maternal</span>
                </div>
            </div>
        </div>

        {/* Top Left Tools */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
             <button onClick={() => setLineageMode(!lineageMode)} className="w-10 h-10 rounded-xl bg-surface/80 backdrop-blur border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary/20 hover:border-primary/50 transition shadow-lg" title="Toggle Lineage Dots">
                 <span className={`material-symbols-outlined text-[20px] ${lineageMode ? 'text-primary' : ''}`}>layers</span>
             </button>
        </div>

        {/* Zoom & Pan Controls */}
        <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
             <div className="bg-surface/90 backdrop-blur border border-white/10 rounded-full p-2 shadow-xl flex flex-col items-center gap-1">
                <button onClick={() => handlePan(0, 50)} className="w-8 h-8 rounded-full hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center">
                    <span className="material-symbols-outlined">keyboard_arrow_up</span>
                </button>
                <div className="flex gap-1">
                    <button onClick={() => handlePan(50, 0)} className="w-8 h-8 rounded-full hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center">
                        <span className="material-symbols-outlined">keyboard_arrow_left</span>
                    </button>
                    <button onClick={handleResetZoom} className="w-8 h-8 rounded-full bg-primary/20 text-primary hover:bg-primary/40 flex items-center justify-center" title="Reset View">
                         <span className="material-symbols-outlined text-sm">center_focus_strong</span>
                    </button>
                    <button onClick={() => handlePan(-50, 0)} className="w-8 h-8 rounded-full hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center">
                        <span className="material-symbols-outlined">keyboard_arrow_right</span>
                    </button>
                </div>
                <button onClick={() => handlePan(0, -50)} className="w-8 h-8 rounded-full hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center">
                    <span className="material-symbols-outlined">keyboard_arrow_down</span>
                </button>
             </div>

             <div className="bg-surface/90 backdrop-blur border border-white/10 rounded-full p-2 shadow-xl flex flex-col gap-2 items-center">
                <button onClick={() => handleZoom(1.3)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-primary/20 text-gray-300 hover:text-white flex items-center justify-center transition" title="Zoom In">
                    <span className="material-symbols-outlined">add</span>
                </button>
                <button onClick={() => handleZoom(0.7)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-primary/20 text-gray-300 hover:text-white flex items-center justify-center transition" title="Zoom Out">
                    <span className="material-symbols-outlined">remove</span>
                </button>
             </div>
        </div>

        {/* Selected Node Action Bar */}
        {selectedNode && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 bg-surface/90 backdrop-blur border border-white/10 rounded-full py-2 px-6 flex items-center shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <span className="text-sm font-bold text-white mr-4">{selectedNode.name}</span>
                <button 
                    onClick={() => onSelectNode(selectedNode.id)}
                    className="bg-primary hover:bg-primary-dark text-white text-xs font-bold px-4 py-1.5 rounded-full transition shadow-lg shadow-primary/20"
                >
                    View Profile
                </button>
                <button 
                    onClick={handleBackgroundClick}
                    className="ml-2 p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition"
                >
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>
        )}

        <div ref={wrapperRef} className="w-full h-full cursor-grab active:cursor-grabbing">
             <svg ref={svgRef}></svg>
        </div>
    </div>
  );
};