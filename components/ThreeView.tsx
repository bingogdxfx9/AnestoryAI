import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Ancestor } from '../types';

interface Props {
  ancestors: Ancestor[];
  onClose: () => void;
}

type ViewMode = 'tree' | 'globe' | 'map';

// Extended type to include generation info for UI
interface AncestorWithGen extends Ancestor {
  gen?: number;
}

// Distinct Color Palette for Generations (Spectrum)
const GENERATION_COLORS = [
    0xef4444, // Gen 0: Red
    0xf97316, // Gen 1: Orange
    0xf59e0b, // Gen 2: Amber
    0x84cc16, // Gen 3: Lime
    0x10b981, // Gen 4: Emerald
    0x06b6d4, // Gen 5: Cyan
    0x3b82f6, // Gen 6: Blue
    0x8b5cf6, // Gen 7: Violet
    0xd946ef, // Gen 8: Fuchsia
    0xf43f5e  // Gen 9: Rose
];

// Coordinate mapping
const COUNTRY_COORDS: Record<string, { lat: number; lon: number }> = {
  "United States": { lat: 37.0902, lon: -95.7129 },
  "United Kingdom": { lat: 55.3781, lon: -3.4360 },
  "Canada": { lat: 56.1304, lon: -106.3468 },
  "Australia": { lat: -25.2744, lon: 133.7751 },
  "Ireland": { lat: 53.1424, lon: -7.6921 },
  "Germany": { lat: 51.1657, lon: 10.4515 },
  "France": { lat: 46.2276, lon: 2.2137 },
  "Italy": { lat: 41.8719, lon: 12.5674 },
  "Spain": { lat: 40.4637, lon: -3.7492 },
  "Mexico": { lat: 23.6345, lon: -102.5528 },
  "China": { lat: 35.8617, lon: 104.1954 },
  "India": { lat: 20.5937, lon: 78.9629 },
  "Japan": { lat: 36.2048, lon: 138.2529 },
  "Brazil": { lat: -14.2350, lon: -51.9253 },
  "Russia": { lat: 61.5240, lon: 105.3188 },
  "South Africa": { lat: -30.5595, lon: 22.9375 },
  "Nigeria": { lat: 9.0820, lon: 8.6753 },
  "Egypt": { lat: 26.8206, lon: 30.8025 },
  "Kenya": { lat: -0.0236, lon: 37.9062 },
  "Ghana": { lat: 7.9465, lon: -1.0232 },
  "Afghanistan": { lat: 33.9391, lon: 67.7100 },
  "Argentina": { lat: -38.4161, lon: -63.6167 },
  "Austria": { lat: 47.5162, lon: 14.5501 },
  "Belgium": { lat: 50.5039, lon: 4.4699 },
  "Chile": { lat: -35.6751, lon: -71.5430 },
  "Colombia": { lat: 4.5709, lon: -74.2973 },
  "Denmark": { lat: 56.2639, lon: 9.5018 },
  "Finland": { lat: 61.9241, lon: 25.7482 },
  "Greece": { lat: 39.0742, lon: 21.8243 },
  "Hungary": { lat: 47.1625, lon: 19.5033 },
  "Indonesia": { lat: -0.7893, lon: 113.9213 },
  "Iran": { lat: 32.4279, lon: 53.6880 },
  "Iraq": { lat: 33.2232, lon: 43.6793 },
  "Israel": { lat: 31.0461, lon: 34.8516 },
  "South Korea": { lat: 35.9078, lon: 127.7669 },
  "Netherlands": { lat: 52.1326, lon: 5.2913 },
  "New Zealand": { lat: -40.9006, lon: 174.8860 },
  "Norway": { lat: 60.4720, lon: 8.4689 },
  "Pakistan": { lat: 30.3753, lon: 69.3451 },
  "Peru": { lat: -9.1900, lon: -75.0152 },
  "Philippines": { lat: 12.8797, lon: 121.7740 },
  "Poland": { lat: 51.9194, lon: 19.1451 },
  "Portugal": { lat: 39.3999, lon: -8.2245 },
  "Saudi Arabia": { lat: 23.8859, lon: 45.0792 },
  "Sweden": { lat: 60.1282, lon: 18.6435 },
  "Switzerland": { lat: 46.8182, lon: 8.2275 },
  "Syria": { lat: 34.8021, lon: 38.9968 },
  "Thailand": { lat: 15.8700, lon: 100.9925 },
  "Turkey": { lat: 38.9637, lon: 35.2433 },
  "Ukraine": { lat: 48.3794, lon: 31.1656 },
  "United Arab Emirates": { lat: 23.4241, lon: 53.8478 },
  "Vietnam": { lat: 14.0583, lon: 108.2772 },
  "Zimbabwe": { lat: -19.0154, lon: 29.1549 }
};

export const ThreeView: React.FC<Props> = ({ ancestors, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedInfo, setSelectedInfo] = useState<AncestorWithGen | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  
  // Shared state for camera controls
  const controlsRef = useRef({
      radius: 40,
      theta: 0,
      phi: Math.PI / 3,
      center: new THREE.Vector3(0, 0, 0)
  });

  const handleZoomIn = () => {
      controlsRef.current.radius = Math.max(5, controlsRef.current.radius * 0.8);
  };

  const handleZoomOut = () => {
      controlsRef.current.radius = Math.min(200, controlsRef.current.radius * 1.2);
  };

  const handleReset = () => {
      controlsRef.current.radius = viewMode === 'tree' ? 40 : 25;
      controlsRef.current.theta = 0;
      controlsRef.current.phi = Math.PI / 3;
      controlsRef.current.center.set(0,0,0);
  };

  useEffect(() => {
    if (!containerRef.current || ancestors.length === 0) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900
    scene.fog = new THREE.Fog(0x0f172a, 10, 300);

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );

    // IMPORTANT: preserveDrawingBuffer: true is required for toDataURL() to work for screenshots
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.domElement.id = "three-canvas"; // Add ID for screenshot capture
    containerRef.current.appendChild(renderer.domElement);

    // --- LOAD TEXTURES ---
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous'); 
    
    // High Quality "Blue Marble" Satellite Texture (Google Maps Style)
    const earthMapUrl = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
    
    // Create materials first with fallback colors
    const earthMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1e293b, // Fallback Dark Blue/Slate
        roughness: 0.4, // Slight gloss for water reflection
        metalness: 0.1
    });

    const flatMapMaterial = new THREE.MeshBasicMaterial({
        color: 0x1e293b, // Fallback Dark Blue/Slate
        side: THREE.DoubleSide
    });

    textureLoader.load(
        earthMapUrl,
        (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearFilter;
            
            // Apply to Globe
            earthMaterial.map = tex;
            earthMaterial.color.setHex(0xffffff); // Reset to white to show texture colors
            earthMaterial.needsUpdate = true;

            // Apply to Flat Map
            flatMapMaterial.map = tex;
            flatMapMaterial.color.setHex(0xffffff);
            flatMapMaterial.needsUpdate = true;
        },
        undefined,
        (err) => {
            console.log("Texture load failed (using fallback color)");
        }
    );

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); 
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 10, 20);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x6366f1, 0.8, 100);
    pointLight.position.set(0, 15, 0);
    scene.add(pointLight);

    // --- INTERACTIVE OBJECTS ---
    const interactables: THREE.Mesh[] = [];
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // --- RENDER MODES ---

    const renderTree = () => {
        const roots = ancestors.filter(a => !a.fatherId && !a.motherId);
        if (roots.length === 0 && ancestors.length > 0) {
            ancestors.sort((a, b) => (a.birthYear || 0) - (b.birthYear || 0));
            roots.push(ancestors[0]);
        }
    
        const generationMap = new Map<string, number>();
        const assignGeneration = (id: string, gen: number) => {
            if (generationMap.has(id) && generationMap.get(id)! >= gen) return;
            generationMap.set(id, gen);
            const children = ancestors.filter(a => a.fatherId === id || a.motherId === id);
            children.forEach(c => assignGeneration(c.id, gen + 1));
        };
    
        roots.forEach(r => assignGeneration(r.id, 0));
        ancestors.forEach(a => { if (!generationMap.has(a.id)) assignGeneration(a.id, 0); });
    
        const byGen: { [key: number]: string[] } = {};
        generationMap.forEach((gen, id) => {
            if (!byGen[gen]) byGen[gen] = [];
            byGen[gen].push(id);
        });
    
        const nodeGroup = new THREE.Group();
        const linkGroup = new THREE.Group();
        const sphereMap = new Map<string, THREE.Mesh>();
        const SPACING_X = 5;
        const SPACING_Z = 8;
    
        ancestors.forEach(person => {
            const gen = generationMap.get(person.id) || 0;
            const peers = byGen[gen] || [person.id];
            const idx = peers.indexOf(person.id);
            const rowWidth = (peers.length - 1) * SPACING_X;
            const xPos = (idx * SPACING_X) - (rowWidth / 2);
            const zPos = (gen * SPACING_Z);
    
            const geometry = new THREE.SphereGeometry(1, 32, 32);
            
            // Color based on generation
            const color = GENERATION_COLORS[gen % GENERATION_COLORS.length];
            
            const material = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(xPos, 0, zPos);
            sphere.userData = { id: person.id, name: person.name, originalColor: color, gen: gen };
            
            nodeGroup.add(sphere);
            interactables.push(sphere);
            sphereMap.set(person.id, sphere);
        });
    
        const linkMaterial = new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.3 });
        
        ancestors.forEach(person => {
            const childMesh = sphereMap.get(person.id);
            if (!childMesh) return;
            [person.fatherId, person.motherId].forEach(pid => {
                if (pid) {
                    const parentMesh = sphereMap.get(pid);
                    if (parentMesh) {
                        const points = [childMesh.position, parentMesh.position];
                        const geom = new THREE.BufferGeometry().setFromPoints(points);
                        const line = new THREE.Line(geom, linkMaterial);
                        linkGroup.add(line);
                    }
                }
            });
        });

        rootGroup.add(nodeGroup);
        rootGroup.add(linkGroup);
        
        // Center view on middle of tree
        const genCount = Object.keys(byGen).length;
        controlsRef.current.center.set(0, 0, (genCount * SPACING_Z) / 2);
    };

    const latLonToVector3 = (lat: number, lon: number, radius: number) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon) * (Math.PI / 180);
        
        const x = -radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.cos(theta);

        return new THREE.Vector3(x, y, z);
    };

    // --- Helper to draw migration arcs ---
    const createMigrationLinks = (
        ancestorList: Ancestor[], 
        posMapper: (lat: number, lon: number) => THREE.Vector3,
        isGlobe: boolean
    ): THREE.Group => {
        const linkGroup = new THREE.Group();
        // Use a semi-transparent material for migration paths
        const material = new THREE.LineBasicMaterial({ 
            color: 0x34d399, // Emerald-400
            transparent: true, 
            opacity: 0.4 
        });

        ancestorList.forEach(person => {
            // If person has no country, skip
            if (!person.country || !COUNTRY_COORDS[person.country]) return;
            
            const childPos = posMapper(
                COUNTRY_COORDS[person.country].lat, 
                COUNTRY_COORDS[person.country].lon
            );

            // Draw line to parents
            [person.fatherId, person.motherId].forEach(pid => {
                if (pid) {
                    const parent = ancestorList.find(a => a.id === pid);
                    if (parent && parent.country && COUNTRY_COORDS[parent.country]) {
                        // Skip if same country to avoid clutter (or we could draw small loops)
                        if (parent.country === person.country) return;

                        const parentPos = posMapper(
                            COUNTRY_COORDS[parent.country].lat, 
                            COUNTRY_COORDS[parent.country].lon
                        );

                        if (isGlobe) {
                            // Draw Great Circle-ish Arc
                            const dist = childPos.distanceTo(parentPos);
                            const mid = childPos.clone().add(parentPos).multiplyScalar(0.5);
                            mid.normalize().multiplyScalar(15 + (dist * 0.5)); // 15 is globe radius
                            
                            const curve = new THREE.QuadraticBezierCurve3(childPos, mid, parentPos);
                            const points = curve.getPoints(24);
                            const geometry = new THREE.BufferGeometry().setFromPoints(points);
                            linkGroup.add(new THREE.Line(geometry, material));
                        } else {
                            // Draw direct line for map
                            const geometry = new THREE.BufferGeometry().setFromPoints([childPos, parentPos]);
                            linkGroup.add(new THREE.Line(geometry, material));
                        }
                    }
                }
            });
        });
        return linkGroup;
    };

    const renderGlobe = () => {
        const radius = 15;
        const geometry = new THREE.SphereGeometry(radius, 64, 64);
        const earth = new THREE.Mesh(geometry, earthMaterial);
        
        earth.rotation.y = -Math.PI / 2;
        
        rootGroup.add(earth);

        // Plot Ancestors
        ancestors.forEach(person => {
            if (!person.country || !COUNTRY_COORDS[person.country]) return;
            const { lat, lon } = COUNTRY_COORDS[person.country];
            
            // Add jitter
            const jLat = lat + (Math.random() - 0.5) * 2;
            const jLon = lon + (Math.random() - 0.5) * 2;

            const pos = latLonToVector3(jLat, jLon, radius + 0.2);
            
            const markerGeo = new THREE.SphereGeometry(0.3, 16, 16);
            let color = 0x94a3b8;
            if (person.gender === 'Male') color = 0x3b82f6;
            if (person.gender === 'Female') color = 0xec4899;

            const marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color }));
            marker.position.copy(pos);
            marker.userData = { id: person.id, name: person.name, originalColor: color };
            
            rootGroup.add(marker);
            interactables.push(marker);
        });
        
        // Add Migration Lines
        const migrationLines = createMigrationLinks(
            ancestors, 
            (lat, lon) => latLonToVector3(lat, lon, radius),
            true
        );
        rootGroup.add(migrationLines);
        
        controlsRef.current.center.set(0, 0, 0);
    };

    const renderFlatMap = () => {
        const width = 40;
        const height = 20;
        const geometry = new THREE.PlaneGeometry(width, height);
        // Re-use texture loaded above on a basic material
        const mapPlane = new THREE.Mesh(geometry, flatMapMaterial);
        rootGroup.add(mapPlane);

        // Helper for map coords
        const getMapPos = (lat: number, lon: number) => {
             // Basic Equirectangular projection mapping
             const x = (lon / 180) * (width / 2);
             const y = (lat / 90) * (height / 2);
             // Jitter calculated inside plotting loop, but here we need consistent center for lines
             // We will assume "center" of country for lines
             return new THREE.Vector3(x, y, 0.5); 
        };

        ancestors.forEach(person => {
            if (!person.country || !COUNTRY_COORDS[person.country]) return;
            const { lat, lon } = COUNTRY_COORDS[person.country];
             // Add jitter
            const jLat = lat + (Math.random() - 0.5) * 2;
            const jLon = lon + (Math.random() - 0.5) * 2;

            const pos = getMapPos(jLat, jLon);

            const markerGeo = new THREE.SphereGeometry(0.3, 16, 16);
             let color = 0x94a3b8;
            if (person.gender === 'Male') color = 0x3b82f6;
            if (person.gender === 'Female') color = 0xec4899;

            const marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color }));
            marker.position.copy(pos);
            marker.userData = { id: person.id, name: person.name, originalColor: color };

            rootGroup.add(marker);
            interactables.push(marker);
        });

        // Add Migration Lines
        // Use z = 0.4 to put lines slightly behind markers but above map
        const migrationLines = createMigrationLinks(
            ancestors,
            (lat, lon) => {
                const p = getMapPos(lat, lon);
                p.z = 0.4;
                return p;
            },
            false
        );
        rootGroup.add(migrationLines);

        controlsRef.current.center.set(0, 0, 0);
    };

    // --- EXECUTE RENDER MODE ---
    if (viewMode === 'tree') renderTree();
    else if (viewMode === 'globe') renderGlobe();
    else if (viewMode === 'map') renderFlatMap();

    // --- ANIMATION & INTERACTION ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let frameId: number;

    const animate = () => {
      // Orbit Logic
      const { radius, theta, phi, center } = controlsRef.current;
      
      const x = center.x + radius * Math.sin(phi) * Math.cos(theta);
      const y = center.y + radius * Math.cos(phi);
      const z = center.z + radius * Math.sin(phi) * Math.sin(theta);
      
      camera.position.set(x, y, z);
      camera.lookAt(center);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    
    // Start animation loop
    animate();

    // --- EVENT LISTENERS ---
    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.offsetX, y: e.offsetY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Hover Logic
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactables);

      if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = 'default';
      }

      // Drag Logic
      if (isDragging) {
        const deltaMove = {
          x: e.offsetX - previousMousePosition.x,
          y: e.offsetY - previousMousePosition.y
        };

        controlsRef.current.theta -= deltaMove.x * 0.01;
        controlsRef.current.phi -= deltaMove.y * 0.01;
        
        // Clamp phi to avoid flipping
        controlsRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, controlsRef.current.phi));

        previousMousePosition = { x: e.offsetX, y: e.offsetY };
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
        isDragging = false;
        
        // Click Logic
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactables);

        if (intersects.length > 0) {
             const mesh = intersects[0].object as THREE.Mesh;
             const personId = mesh.userData.id;
             const person = ancestors.find(a => a.id === personId);
             
             if (person) {
                 const info: AncestorWithGen = { ...person };
                 if (mesh.userData.gen !== undefined) {
                    info.gen = mesh.userData.gen;
                 }
                 setSelectedInfo(info);
             }
             
             // Highlight
             interactables.forEach((m: any) => {
                 (m.material as THREE.MeshStandardMaterial).color.setHex(m.userData.originalColor);
             });
             (mesh.material as THREE.MeshStandardMaterial).color.setHex(0xffff00);
        } else {
            setSelectedInfo(null);
            interactables.forEach((m: any) => {
                 (m.material as THREE.MeshStandardMaterial).color.setHex(m.userData.originalColor);
            });
        }
    };

    const handleWheel = (e: WheelEvent) => {
        controlsRef.current.radius += e.deltaY * 0.05;
        controlsRef.current.radius = Math.max(5, Math.min(200, controlsRef.current.radius));
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel);

    return () => {
      cancelAnimationFrame(frameId);
      if (containerRef.current && renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [ancestors, viewMode]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-fade-in">
       {/* Controls Bar */}
       <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex space-x-2 bg-slate-800/80 p-2 rounded-lg border border-slate-600 backdrop-blur-sm">
          <button 
            onClick={() => setViewMode('tree')}
            className={`px-4 py-1 rounded text-sm font-bold ${viewMode === 'tree' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            Tree Structure
          </button>
          <button 
            onClick={() => setViewMode('globe')}
            className={`px-4 py-1 rounded text-sm font-bold ${viewMode === 'globe' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            3D Globe
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`px-4 py-1 rounded text-sm font-bold ${viewMode === 'map' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
          >
            Flat Map
          </button>
       </div>

       {/* Close Button */}
       <button 
         onClick={onClose}
         className="absolute top-4 right-4 z-10 text-white hover:text-red-400 bg-slate-800/50 p-2 rounded-full"
       >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
         </svg>
       </button>

      {/* Zoom Controls */}
      <div className="absolute bottom-10 right-4 z-10 flex flex-col space-y-2">
           <button onClick={handleZoomIn} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-full shadow-lg border border-slate-500">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
           </button>
           <button onClick={handleReset} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-full shadow-lg border border-slate-500" title="Reset View">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
           </button>
           <button onClick={handleZoomOut} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-full shadow-lg border border-slate-500">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
           </button>
      </div>

      <div ref={containerRef} className="w-full h-full cursor-move" />

      {selectedInfo && (
        <div className="absolute bottom-10 left-10 z-10 bg-slate-800/90 border border-slate-600 p-4 rounded-xl shadow-xl backdrop-blur-md max-w-sm text-white animate-fade-in-up">
           <h3 className="text-xl font-bold text-indigo-400">{selectedInfo.name}</h3>
           <p className="text-slate-300 text-sm mt-1">{selectedInfo.birthYear || '?'} - {selectedInfo.deathYear || '?'}</p>
           {selectedInfo.country && (
               <div className="mt-2 inline-block px-2 py-1 bg-slate-700 rounded text-xs font-mono text-emerald-300 border border-emerald-900">
                   📍 {selectedInfo.country}
               </div>
           )}
           {viewMode === 'tree' && (
               <div className="mt-2 text-xs text-indigo-300">
                   Generation: {selectedInfo.gen !== undefined ? selectedInfo.gen : '?'}
               </div>
           )}
           <p className="text-slate-400 text-xs mt-2 italic border-t border-slate-700 pt-2">{selectedInfo.notes || 'No notes.'}</p>
        </div>
      )}

      <div className="absolute bottom-4 w-full text-center text-slate-500 text-xs pointer-events-none">
          Click & Drag to Rotate • Scroll to Zoom • Click Nodes for Info
      </div>
    </div>
  );
}