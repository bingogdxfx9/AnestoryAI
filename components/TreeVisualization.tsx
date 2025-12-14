import React, { useEffect, useRef, useState } from 'react';
import { 
  select, 
  zoom, 
  zoomIdentity, 
  hierarchy, 
  tree, 
  linkVertical
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
  const [lineageMode, setLineageMode] = useState(true);

  useEffect(() => {
    if (!ancestors.length || !svgRef.current || !wrapperRef.current) return;

    const width = wrapperRef.current.clientWidth;
    const height = wrapperRef.current.clientHeight || 800;
    
    // Clear previous
    select(svgRef.current).selectAll("*").remove();

    const svg = select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .style("background", "transparent"); // Transparent for grid bg

    const g = svg.append("g");

    // Zoom setup
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoomBehavior as any);
    // Initial Center
    svg.call(zoomBehavior.transform as any, zoomIdentity.translate(width/2, 50).scale(0.8));

    // Data Prep
    // Simple logic to find a root (oldest with no parents in set, or just oldest)
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
      .attr("class", "tree-line")
      .attr("fill", "none")
      .attr("stroke", "#475569") // slate-600
      .attr("stroke-width", 1.5)
      .attr("d", linkVertical()
        .x((d: any) => d.x)
        .y((d: any) => d.y) as any
      );

    // Lineage Dots on Links
    if (lineageMode) {
        g.selectAll(".lineage-dot")
           .data(root.links())
           .enter()
           .append("circle")
           .attr("cx", (d: any) => (d.source.x + d.target.x) / 2)
           .attr("cy", (d: any) => (d.source.y + d.target.y) / 2)
           .attr("r", 4)
           .attr("fill", (d: any) => {
               // Simple heuristic: If parent is male -> paternal color
               const parent = d.source.data;
               return parent.gender === 'Male' ? '#14b8a6' : '#ec4899'; // Teal vs Pink
           })
           .attr("stroke", "#0f172a")
           .attr("stroke-width", 2);
    }

    // Nodes (Cards)
    const nodes = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node cursor-pointer transition-opacity")
      .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
      .on("click", (e, d: any) => {
          e.stopPropagation();
          onSelectNode(d.data.id);
      })
      .attr("opacity", (d: any) => filteredIds && !filteredIds.includes(d.data.id) ? 0.3 : 1);

    // Card Background
    nodes.append("rect")
      .attr("x", -80)
      .attr("y", 0)
      .attr("width", 160)
      .attr("height", 80)
      .attr("rx", 16)
      .attr("fill", "#1e293b") // surface-dark
      .attr("stroke", (d: any) => filteredIds && filteredIds.includes(d.data.id) ? "#2563EB" : "rgba(255,255,255,0.1)")
      .attr("stroke-width", (d: any) => filteredIds && filteredIds.includes(d.data.id) ? 2 : 1)
      .style("filter", "drop-shadow(0 4px 6px rgba(0,0,0,0.3))");

    // Top Line Indicator (Gender)
    nodes.append("rect")
       .attr("x", -15)
       .attr("y", -6)
       .attr("width", 30)
       .attr("height", 6)
       .attr("rx", 3)
       .attr("fill", (d: any) => d.data.gender === 'Male' ? '#14b8a6' : '#ec4899'); // Teal/Pink

    // Clip Path for Image
    nodes.append("clipPath")
      .attr("id", (d: any) => `clip-${d.data.id}`)
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0) // At top edge
      .attr("r", 24);

    // Avatar Circle Background
    nodes.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 26)
      .attr("fill", "#1e293b")
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-width", 1);

    // Avatar Image or Placeholder
    nodes.each(function(d: any) {
        const gNode = select(this);
        if (d.data.photoUrl) {
            gNode.append("image")
                .attr("xlink:href", d.data.photoUrl)
                .attr("x", -24)
                .attr("y", -24)
                .attr("width", 48)
                .attr("height", 48)
                .attr("clip-path", `url(#clip-${d.data.id})`)
                .attr("preserveAspectRatio", "xMidYMid slice");
        } else {
             gNode.append("text")
                .attr("y", 8)
                .attr("text-anchor", "middle")
                .style("font-family", "Inter")
                .style("font-weight", "bold")
                .style("fill", "#64748b")
                .style("font-size", "18px")
                .text(d.data.name.charAt(0));
        }
    });

    // Name Text
    nodes.append("text")
      .attr("dy", 45)
      .attr("text-anchor", "middle")
      .style("font-family", "Inter")
      .style("font-weight", "600")
      .style("fill", "#fff")
      .style("font-size", "12px")
      .text((d: any) => d.data.name.length > 18 ? d.data.name.substring(0,16)+'...' : d.data.name);

    // Date Text
    nodes.append("text")
      .attr("dy", 62)
      .attr("text-anchor", "middle")
      .style("font-family", "Inter")
      .style("fill", "#94a3b8")
      .style("font-size", "10px")
      .text((d: any) => `${d.data.birthYear || '?'} - ${d.data.deathYear || ''}`);

  }, [ancestors, filteredIds, lineageMode]);

  return (
    <div className="relative w-full h-full bg-background overflow-hidden animate-fade-in">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        </div>
        
        {/* Controls */}
        <div className="absolute top-4 right-4 z-10">
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

        <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
             <button className="w-10 h-10 rounded-xl bg-surface/80 backdrop-blur border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary/20 hover:border-primary/50 transition shadow-lg">
                 <span className="material-symbols-outlined text-[20px]">layers</span>
             </button>
             <button className="w-10 h-10 rounded-xl bg-surface/80 backdrop-blur border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary/20 hover:border-primary/50 transition shadow-lg">
                 <span className="material-symbols-outlined text-[20px]">settings</span>
             </button>
        </div>

        <div ref={wrapperRef} className="w-full h-full cursor-grab active:cursor-grabbing">
             <svg ref={svgRef}></svg>
        </div>
    </div>
  );
};