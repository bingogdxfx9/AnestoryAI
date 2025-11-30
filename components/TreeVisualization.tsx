import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Ancestor } from '../types';

interface TreeProps {
  ancestors: Ancestor[];
  filteredIds: string[] | null; // New prop for RQL search results
  onSelectNode: (id: string) => void;
}

type ColorMode = 'gender' | 'lineage' | 'origin' | 'generation';

export const TreeVisualization: React.FC<TreeProps> = ({ ancestors, filteredIds, onSelectNode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('gender');
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity.translate(80, 300));
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // State for dynamic legend
  const [legendItems, setLegendItems] = useState<{ color: string; label: string }[]>([]);

  useEffect(() => {
    if (!ancestors.length || !svgRef.current || !wrapperRef.current) return;

    const width = wrapperRef.current.clientWidth;
    const height = Math.max(600, ancestors.length * 60); 
    
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        zoomTransformRef.current = event.transform;
      });
    
    zoomBehaviorRef.current = zoom;

    svg.call(zoom as any);
    svg.call(zoom.transform as any, zoomTransformRef.current);

    // --- DATA PREPARATION ---
    const potentialRoots = ancestors.filter(a => !a.fatherId && !a.motherId);
    const sortedByAge = [...ancestors].sort((a, b) => (a.birthYear || 9999) - (b.birthYear || 9999));
    const rootAncestor = potentialRoots[0] || sortedByAge[0];

    if (!rootAncestor) return;

    const buildTree = (personId: string): any => {
      const person = ancestors.find(a => a.id === personId);
      if (!person) return null;

      const children = ancestors
        .filter(a => a.fatherId === personId || a.motherId === personId)
        .map(child => buildTree(child.id))
        .filter(Boolean);

      return {
        name: person.name,
        id: person.id,
        data: person,
        children: children.length ? children : undefined
      };
    };

    const treeData = buildTree(rootAncestor.id);
    const hierarchy = d3.hierarchy(treeData);

    const treeLayout = d3.tree().nodeSize([60, 180]); 
    const root = treeLayout(hierarchy as any);

    const focusNode = focusId ? root.descendants().find((d: any) => d.data.id === focusId) : null;

    // --- PRE-CALCULATE METADATA & COLORS ---
    let maxDepth = 0;
    root.each((d: any) => { if (d.depth > maxDepth) maxDepth = d.depth; });

    const branchColorScale = d3.scaleOrdinal(d3.schemeCategory10);
    const originColorScale = d3.scaleOrdinal(d3.schemeSet3);
    const generationColorScale = d3.scaleSequential(d3.interpolateGnBu).domain([0, maxDepth]);
    const originsFound = new Set<string>();

    root.each((d: any) => {
      // 1. Lineage (Branch from Root)
      if (d.depth === 0) {
        d.branchId = 'root';
      } else if (d.depth === 1) {
        d.branchId = d.data.id;
      } else {
        d.branchId = d.parent.branchId;
      }

      // 2. Origin (Using country field, falling back to Notes extraction)
      if (d.data.data.country) {
          d.origin = d.data.data.country;
      } else {
          const noteText = d.data.data.notes || "";
          const originMatch = noteText.match(/Origin:\s*([a-zA-Z\s]+)/i);
          d.origin = originMatch ? originMatch[1].trim() : "Unknown";
      }
      
      if (d.origin !== 'Unknown') originsFound.add(d.origin);
    });

    // Update Legend State based on Mode
    if (colorMode === 'gender') {
      setLegendItems([
        { color: '#bfdbfe', label: 'Male' },
        { color: '#fecaca', label: 'Female' },
        { color: '#e2e8f0', label: 'Unknown' },
      ]);
    } else if (colorMode === 'lineage') {
      const branches = (root.children || []).map((c: any) => ({
        color: branchColorScale(c.data.id),
        label: c.data.name.split(' ')[0] + "'s Line"
      }));
      setLegendItems(branches);
    } else if (colorMode === 'origin') {
      const items = Array.from(originsFound).map(o => ({
        color: originColorScale(o),
        label: o
      }));
      if (items.length === 0) {
         setLegendItems([{ color: '#e2e8f0', label: 'No Country Data' }]);
      } else {
         items.push({ color: '#e2e8f0', label: 'Unknown' });
         setLegendItems(items);
      }
    } else if (colorMode === 'generation') {
      // Create representative legend items for the gradient
      const items = [];
      const steps = Math.min(4, maxDepth + 1);
      for(let i=0; i < steps; i++) {
        const d = Math.round((i / (steps-1)) * maxDepth);
        items.push({
            color: generationColorScale(d),
            label: `Gen ${d + 1}`
        });
      }
      setLegendItems(items.length ? items : [{color: generationColorScale(0), label: 'Gen 1'}]);
    }

    // --- PATH HIGHLIGHTING LOGIC ---
    const ancestorIds = new Set<string>();
    const descendantIds = new Set<string>();
    const relatedIds = new Set<string>(); 

    if (focusNode) {
        relatedIds.add(focusNode.data.id);
        let curr = focusNode.parent;
        while (curr) {
            ancestorIds.add(curr.data.id);
            relatedIds.add(curr.data.id);
            curr = curr.parent;
        }
        focusNode.descendants().slice(1).forEach((d: any) => {
            descendantIds.add(d.data.id);
            relatedIds.add(d.data.id);
        });
    }

    // --- HELPER: Is Node Active? (Search + Selection) ---
    const isNodeActive = (d: any) => {
        if (filteredIds) {
            return filteredIds.includes(d.data.id);
        }
        if (!focusId) return true;
        const isSibling = focusNode && focusNode.parent && focusNode.parent.children.includes(d);
        return relatedIds.has(d.data.id) || isSibling;
    };

    // --- RENDERING LAYERS ---
    const gridLayer = g.append("g").attr("class", "grid");
    const groupLayer = g.append("g").attr("class", "groups"); 
    const linkLayer = g.append("g").attr("class", "links");
    const relationLayer = g.append("g").attr("class", "relations");
    const nodeLayer = g.append("g").attr("class", "nodes");

    // --- GENERATION MARKERS & BANDS ---
    const depths: number[] = (Array.from(new Set(root.descendants().map((d: any) => d.y as number))) as number[]).sort((a, b) => a - b);
    let minY = Infinity, maxY = -Infinity;
    root.each((d: any) => {
      if (d.x < minY) minY = d.x;
      if (d.x > maxY) maxY = d.x;
    });
    const gridTop = minY - 50;
    const gridBottom = maxY + 50;

    // Draw Alternating Bands (Swim Lanes)
    if (depths.length > 1) {
        const gap = depths[1] - depths[0]; // Assume reasonably uniform tree layout
        gridLayer.selectAll(".gen-band")
            .data(depths)
            .enter()
            .append("rect")
            .attr("x", d => d - (gap/2))
            .attr("y", gridTop)
            .attr("width", gap)
            .attr("height", gridBottom - gridTop)
            .attr("fill", (d, i) => i % 2 === 0 ? "var(--tw-prose-pre-bg)" : "transparent") // Alternating subtle check
            .attr("class", "fill-slate-100/50 dark:fill-slate-800/30") 
            .attr("opacity", colorMode === 'generation' ? 1 : 0); // Only visible nicely in generation mode, or always subtle
    }

    gridLayer.selectAll(".gen-line")
      .data(depths)
      .enter()
      .append("line")
      .attr("x1", d => d)
      .attr("x2", d => d)
      .attr("y1", gridTop)
      .attr("y2", gridBottom)
      .attr("class", "stroke-slate-200 dark:stroke-slate-700")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5 5");

    gridLayer.selectAll(".gen-label")
      .data(depths)
      .enter()
      .append("text")
      .attr("x", d => d)
      .attr("y", gridTop - 10)
      .text((d, i) => `Gen ${i + 1}`)
      .attr("text-anchor", "middle")
      .attr("class", "fill-slate-400 dark:fill-slate-500")
      .attr("font-size", "10px")
      .attr("font-weight", "bold");

    // --- SIBLING HULLS (ENHANCED) ---
    const parentsWithMultiChildren = root.descendants().filter((d: any) => d.children && d.children.length > 1);
    
    groupLayer.selectAll(".sibling-hull")
        .data(parentsWithMultiChildren)
        .enter()
        .append("rect")
        .attr("x", (d: any) => d.children[0].y - 24)
        .attr("y", (d: any) => d3.min(d.children, (c: any) => c.x) - 30)
        .attr("width", 48)
        .attr("height", (d: any) => (d3.max(d.children, (c: any) => c.x) - d3.min(d.children, (c: any) => c.x)) + 60)
        .attr("rx", 24)
        .attr("ry", 24)
        .attr("class", (d: any) => {
             return "transition-colors duration-200";
        })
        .attr("fill", (d: any) => {
            if (focusId) {
                if (d.children.some((c: any) => c.data.id === focusId)) return "#eff6ff"; // Blue-50
                if (descendantIds.has(d.data.id)) return "#f0fdf4"; // Green-50
                return "#f8fafc"; 
            }
            return "#f1f5f9"; // Default Slate-100
        })
        .attr("stroke", (d: any) => {
            if (focusId) {
                if (d.children.some((c: any) => c.data.id === focusId)) return "#93c5fd"; // Blue-300
                if (descendantIds.has(d.data.id)) return "#86efac"; // Green-300
                return "#e2e8f0";
            }
            return "#e2e8f0"; // Default Slate-200
        })
        .attr("fill-opacity", 0.5)
        .attr("stroke-width", (d: any) => {
             if (focusId && d.children.some((c: any) => c.data.id === focusId)) return 2;
             return 1.5;
        })
        .attr("stroke-dasharray", (d: any) => {
            if (focusId && d.children.some((c: any) => c.data.id === focusId)) return "none";
            return "6 4";
        })
        .attr("opacity", (d: any) => {
            if (filteredIds) return 0.05; // Fade background boxes heavily during search
            return 1;
        });

    // --- LINKS ---
    linkLayer.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("d", d3.linkHorizontal().x((d: any) => d.y).y((d: any) => d.x) as any)
      .attr("fill", "none")
      .attr("stroke", (d: any) => {
        if (hoverId && (d.source.data.id === hoverId || d.target.data.id === hoverId)) return "#818cf8"; // Hover
        if (filteredIds) {
             // Distinct Amber-500 color for links matching filter
             return (filteredIds.includes(d.source.data.id) && filteredIds.includes(d.target.data.id)) ? "#f59e0b" : "#475569";
        }
        if (!focusId) {
            // Apply generation color to links if in generation mode
            if (colorMode === 'generation') {
                return generationColorScale(d.target.depth);
            }
            return "#94a3b8"; // Default Slate-400
        }
        if (ancestorIds.has(d.target.data.id) || d.target.data.id === focusId) return "#ea580c";
        if (descendantIds.has(d.target.data.id)) return "#16a34a";
        return "#475569";
      })
      .attr("stroke-width", (d: any) => {
        if (hoverId && (d.source.data.id === hoverId || d.target.data.id === hoverId)) return 3; // Hover
        if (filteredIds) return 1;
        if (!focusId) return 1.5;
        if (ancestorIds.has(d.target.data.id) || d.target.data.id === focusId || descendantIds.has(d.target.data.id)) return 3;
        return 1;
      })
      .attr("opacity", (d: any) => {
        if (filteredIds) {
             // Dim non-matching links significantly
             return (filteredIds.includes(d.source.data.id) && filteredIds.includes(d.target.data.id)) ? 1 : 0.1;
        }
        if (!focusId) return 1;
        if (ancestorIds.has(d.target.data.id) || d.target.data.id === focusId || descendantIds.has(d.target.data.id)) return 1;
        return 0.15;
      });

    // --- COUSIN LINKS (EXPLICIT) ---
    if (focusNode && !filteredIds) {
        const cousins = root.descendants().filter((d: any) => 
          d.depth === focusNode.depth && d.parent !== focusNode.parent && d.data.id !== focusId
        );

        relationLayer.selectAll(".cousin-link")
          .data(cousins)
          .enter()
          .append("path")
          .attr("d", (d: any) => {
            const path = d3.path();
            path.moveTo(focusNode.y, focusNode.x);
            // Quadratic curve to the cousin, dipping slightly for visual separation
            path.quadraticCurveTo(focusNode.y - 60, (focusNode.x + d.x) / 2, d.y, d.x);
            return path.toString();
          })
          .attr("fill", "none")
          .attr("stroke", "#9333ea")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "3 3")
          .attr("opacity", 0.3);
    }

    // --- NODES ---
    const nodes = nodeLayer.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`)
      .on("click", (event, d: any) => {
        event.stopPropagation(); 
        const newId = d.data.id === focusId ? null : d.data.id;
        setFocusId(newId);
        if (newId) onSelectNode(newId);
      })
      .on("mouseenter", (event, d: any) => {
          setHoverId(d.data.id);
      })
      .on("mouseleave", () => {
          setHoverId(null);
      });

    nodes.append("circle")
      .attr("r", 6)
      .attr("fill", (d: any) => {
        if (colorMode === 'lineage') {
            return d.branchId === 'root' ? '#cbd5e1' : branchColorScale(d.branchId);
        }
        if (colorMode === 'origin') {
            return d.origin === 'Unknown' ? '#e2e8f0' : originColorScale(d.origin);
        }
        if (colorMode === 'generation') {
            return generationColorScale(d.depth);
        }
        // Gender Default
        const gender = d.data.data.gender;
        if (gender === 'Male') return '#bfdbfe'; 
        if (gender === 'Female') return '#fecaca'; 
        return '#e2e8f0'; 
      })
      .attr("stroke", (d: any) => {
        if (hoverId === d.data.id) return "#818cf8"; // Hover Highlight
        // Distinct Amber-500 for search matches
        if (filteredIds) return filteredIds.includes(d.data.id) ? "#f59e0b" : "#e2e8f0";
        if (d.data.id === focusId) return "#4f46e5"; 
        if (ancestorIds.has(d.data.id)) return "#ea580c"; 
        if (descendantIds.has(d.data.id)) return "#16a34a"; 
        return "#64748b"; 
      })
      .attr("stroke-width", (d: any) => {
        if (hoverId === d.data.id) return 4;
        if (filteredIds) return filteredIds.includes(d.data.id) ? 3 : 1;
        if (d.data.id === focusId) return 3;
        if (ancestorIds.has(d.data.id) || descendantIds.has(d.data.id)) return 2.5;
        return 1.5;
      })
      .attr("opacity", (d: any) => isNodeActive(d) ? 1 : 0.1) // Dim non-matches
      .style("cursor", "pointer");

    nodes.append("text")
      .attr("dy", 3)
      .attr("x", (d: any) => d.children ? -12 : 12)
      .style("text-anchor", (d: any) => d.children ? "end" : "start")
      .text((d: any) => d.data.name)
      .style("font-size", "12px")
      .style("font-weight", (d: any) => d.data.id === focusId || (filteredIds && filteredIds.includes(d.data.id)) || d.data.id === hoverId ? "bold" : "normal")
      // Use classes for dynamic fill logic
      .attr("class", "fill-slate-800 dark:fill-slate-200 pointer-events-none")
      .style("text-shadow", "0 1px 0 rgba(255,255,255,0.2)")
      .attr("opacity", (d: any) => isNodeActive(d) ? 1 : 0.1); // Dim non-matches

    nodes.append("title")
      .text((d: any) => `${d.data.name}\nBorn: ${d.data.data.birthYear || '?'}\nCountry: ${d.data.data.country || 'Unknown'}`);

  }, [ancestors, focusId, onSelectNode, filteredIds, colorMode, hoverId]);

  // Zoom handlers
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
        d3.select(svgRef.current).transition().call(zoomBehaviorRef.current.scaleBy, 1.2);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
        d3.select(svgRef.current).transition().call(zoomBehaviorRef.current.scaleBy, 0.8);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
        d3.select(svgRef.current).transition().call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(80, 300));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 transition-colors">
      <div className="flex flex-col mb-4 gap-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tree Explorer</h3>
             
             {/* Color Mode Selector */}
             <div className="flex items-center text-sm gap-2 bg-slate-50 dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 font-medium px-2">Color By:</span>
                <button 
                  onClick={() => setColorMode('gender')}
                  className={`px-3 py-1 rounded transition ${colorMode === 'gender' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  Gender
                </button>
                <button 
                  onClick={() => setColorMode('lineage')}
                  className={`px-3 py-1 rounded transition ${colorMode === 'lineage' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  Family Line
                </button>
                <button 
                  onClick={() => setColorMode('origin')}
                  className={`px-3 py-1 rounded transition ${colorMode === 'origin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  title="Visualize Country"
                >
                  Country
                </button>
                <button 
                  onClick={() => setColorMode('generation')}
                  className={`px-3 py-1 rounded transition ${colorMode === 'generation' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  Generation
                </button>
             </div>

             {filteredIds && (
                 <div className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/50 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
                     Filtered View ({filteredIds.length} matches)
                 </div>
            )}
        </div>
        
        {!filteredIds && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700">
          <div className="flex items-center font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Key:</div>
          
          {/* Dynamic Legend based on Color Mode */}
          {legendItems.map((item, idx) => (
             <div key={idx} className="flex items-center">
                 <span className="w-3 h-3 rounded-full border border-slate-300 mr-1" style={{ backgroundColor: item.color }}></span> 
                 {item.label}
             </div>
          ))}
          
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-2 hidden sm:block"></div>
          
          <div className="flex items-center font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Relations:</div>
          <div className="flex items-center"><span className="w-3 h-3 rounded-full border-2 border-orange-600 bg-white mr-1"></span> Ancestors</div>
          <div className="flex items-center"><span className="w-3 h-3 rounded-full border-2 border-green-600 bg-white mr-1"></span> Descendants</div>
          <div className="flex items-center"><span className="w-3 h-3 bg-blue-50 border border-blue-300 rounded-sm mr-1"></span> Siblings (Grouped)</div>
        </div>
        )}
      </div>

      <div ref={wrapperRef} className="w-full h-[600px] overflow-hidden border border-slate-100 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900 relative group transition-colors">
        <svg ref={svgRef} id="tree-svg" className="w-full h-full cursor-move block"></svg>
        
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white dark:bg-slate-700 rounded shadow border border-slate-200 dark:border-slate-600 p-1 opacity-80 hover:opacity-100 transition">
             <button onClick={handleZoomIn} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded" title="Zoom In">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600 dark:text-slate-200" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                 </svg>
             </button>
             <button onClick={handleResetZoom} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded" title="Reset View">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                 </svg>
             </button>
             <button onClick={handleZoomOut} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded" title="Zoom Out">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600 dark:text-slate-200" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                 </svg>
             </button>
        </div>

        {!focusId && !filteredIds && (
            <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-slate-800/80 p-2 rounded text-xs text-slate-500 dark:text-slate-400 pointer-events-none border border-slate-200 dark:border-slate-600 shadow-sm">
                Click a node to highlight relationships
            </div>
        )}
      </div>
    </div>
  );
};