"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { FlowNode, FlowEdge } from "@/app/flow/page";
import Link from "next/link";
import { formatNumber } from "@/lib/types";
import { TrendingUp, TrendingDown, ExternalLink, Move } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlowMapProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodeClick: (node: FlowNode) => void;
  isPlaying: boolean;
}

interface Particle {
  id: number;
  edgeId: string;
  progress: number;
  speed: number;
}

const loadedImages = new Map<string, HTMLImageElement>();

export function FlowMap({ nodes: initialNodes, edges, onNodeClick, isPlaying }: FlowMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<FlowNode | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggedNode, setDraggedNode] = useState<FlowNode | null>(null);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const particleIdRef = useRef(0);

  const nodes = initialNodes.map(node => {
    const customPos = nodePositions.get(node.id);
    if (customPos) {
      return { ...node, x: customPos.x, y: customPos.y };
    }
    return node;
  });

  useEffect(() => {
    const loadImages = async () => {
      const promises = initialNodes.map((node) => {
        if (node.logoUrl && !loadedImages.has(node.id)) {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(node.logoUrl!)}`;
            const fallbackProxyUrl = `/api/proxy-image?url=${encodeURIComponent(`https://dd.dexscreener.com/ds-data/tokens/solana/${node.id}.png`)}`;
            
            let tried = 0;
            const tryLoad = (url: string) => {
              img.onload = () => {
                loadedImages.set(node.id, img);
                resolve();
              };
              img.onerror = () => {
                tried++;
                if (tried === 1) {
                  // Try proxy
                  tryLoad(proxyUrl);
                } else if (tried === 2) {
                  // Try fallback proxy
                  tryLoad(fallbackProxyUrl);
                } else {
                  resolve();
                }
              };
              img.src = url;
            };
            
            // Start by trying direct URL first
            tryLoad(node.logoUrl!);
          });
        }
        return Promise.resolve();
      });
      
      await Promise.all(promises);
      setImagesLoaded(true);
    };
    
    if (initialNodes.length > 0) {
      loadImages();
    }
  }, [initialNodes]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!isPlaying || edges.length === 0) return;
    
    const interval = setInterval(() => {
      if (Math.random() < 0.4) {
        const randomEdge = edges[Math.floor(Math.random() * edges.length)];
        setParticles(prev => [...prev.slice(-50), {
          id: particleIdRef.current++,
          edgeId: randomEdge.id,
          progress: 0,
          speed: 0.012 + Math.random() * 0.008,
        }]);
      }
    }, 150);
    
    return () => clearInterval(interval);
  }, [isPlaying, edges]);

  useEffect(() => {
    if (!isPlaying) return;
    
    const animationFrame = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({ ...p, progress: p.progress + p.speed }))
        .filter(p => p.progress < 1)
      );
    }, 16);
    
    return () => clearInterval(animationFrame);
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || dimensions.width === 0 || nodes.length === 0) return;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    const gradient = ctx.createRadialGradient(
      dimensions.width / 2, dimensions.height / 2, 0,
      dimensions.width / 2, dimensions.height / 2, dimensions.width * 0.6
    );
    gradient.addColorStop(0, "#0d1117");
    gradient.addColorStop(1, "#0b0e11");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return;

      const sx = sourceNode.x * dimensions.width;
      const sy = sourceNode.y * dimensions.height;
      const tx = targetNode.x * dimensions.width;
      const ty = targetNode.y * dimensions.height;

      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2;
      const ctrlX = midX + (Math.random() - 0.5) * 20;
      const ctrlY = midY - 20 - Math.random() * 15;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(ctrlX, ctrlY, tx, ty);
      
      const edgeGradient = ctx.createLinearGradient(sx, sy, tx, ty);
      edgeGradient.addColorStop(0, `${sourceNode.color}30`);
      edgeGradient.addColorStop(1, `${targetNode.color}30`);
      ctx.strokeStyle = edgeGradient;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    particles.forEach((particle) => {
      const edge = edges.find(e => e.id === particle.edgeId);
      if (!edge) return;
      
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return;

      const sx = sourceNode.x * dimensions.width;
      const sy = sourceNode.y * dimensions.height;
      const tx = targetNode.x * dimensions.width;
      const ty = targetNode.y * dimensions.height;
      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2 - 20;

      const t = particle.progress;
      const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * midX + t * t * tx;
      const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * midY + t * t * ty;

      const particleGradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
      particleGradient.addColorStop(0, "#ffffff");
      particleGradient.addColorStop(0.3, targetNode.color);
      particleGradient.addColorStop(1, "transparent");
      
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = particleGradient;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });

    nodes.forEach((node) => {
      const x = node.x * dimensions.width;
      const y = node.y * dimensions.height;
      const size = node.size;
      const isHovered = hoveredNode?.id === node.id;
      const isBeingDragged = draggedNode?.id === node.id;

      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
      glowGradient.addColorStop(0, `${node.color}50`);
      glowGradient.addColorStop(0.5, `${node.color}20`);
      glowGradient.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, size + 3, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = "#1e2329";
      ctx.fill();

      const img = loadedImages.get(node.id);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, size - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - size + 2, y - size + 2, (size - 2) * 2, (size - 2) * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${size * 0.8}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label.charAt(0), x, y);
      }

      if (isHovered || isBeingDragged) {
        ctx.beginPath();
        ctx.arc(x, y, size + 6, 0, Math.PI * 2);
        ctx.strokeStyle = isBeingDragged ? "#02c076" : "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        if (isBeingDragged) {
          ctx.beginPath();
          ctx.arc(x, y, size + 10, 0, Math.PI * 2);
          ctx.strokeStyle = "#02c07650";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold 11px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      
      ctx.fillStyle = "#000000";
      ctx.fillText(node.label, x + 1, y + size + 7);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(node.label, x, y + size + 6);

      if (node.metadata?.priceChange !== undefined) {
        const change = node.metadata.priceChange;
        const changeText = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
        ctx.font = `bold 9px Inter, system-ui, sans-serif`;
        ctx.fillStyle = change >= 0 ? "#02c076" : "#f6465d";
        ctx.fillText(changeText, x, y + size + 20);
      }
    });

    ctx.restore();

  }, [dimensions, nodes, edges, hoveredNode, draggedNode, particles, offset, scale, imagesLoaded]);

  const getNodeAtPosition = useCallback((clientX: number, clientY: number): FlowNode | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const x = (clientX - rect.left - offset.x) / scale;
    const y = (clientY - rect.top - offset.y) / scale;

    for (const node of nodes) {
      const nx = node.x * dimensions.width;
      const ny = node.y * dimensions.height;
      const dist = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
      if (dist < node.size * 1.5) {
        return node;
      }
    }
    return null;
  }, [nodes, dimensions, offset, scale]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingNode && draggedNode) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = (e.clientX - rect.left - offset.x) / scale / dimensions.width;
      const y = (e.clientY - rect.top - offset.y) / scale / dimensions.height;
      
      const clampedX = Math.max(0.05, Math.min(0.95, x));
      const clampedY = Math.max(0.05, Math.min(0.95, y));
      
      setNodePositions(prev => {
        const next = new Map(prev);
        next.set(draggedNode.id, { x: clampedX, y: clampedY });
        return next;
      });
      return;
    }
    
    if (isDragging) {
      setOffset(prev => ({
        x: prev.x + (e.clientX - lastPos.x),
        y: prev.y + (e.clientY - lastPos.y),
      }));
      setLastPos({ x: e.clientX, y: e.clientY });
      return;
    }

    const node = getNodeAtPosition(e.clientX, e.clientY);
    setHoveredNode(node);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingNode) return;
    
    const node = getNodeAtPosition(e.clientX, e.clientY);
    if (node) {
      onNodeClick(node);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, scale * delta));
    
    const scaleRatio = newScale / scale;
    setOffset(prev => ({
      x: mouseX - (mouseX - prev.x) * scaleRatio,
      y: mouseY - (mouseY - prev.y) * scaleRatio,
    }));
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      const node = getNodeAtPosition(e.clientX, e.clientY);
      if (node) {
        setIsDraggingNode(true);
        setDraggedNode(node);
        setLastPos({ x: e.clientX, y: e.clientY });
      } else {
        setIsDragging(true);
        setLastPos({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseUp = () => {
    if (isDraggingNode && draggedNode) {
      setIsDraggingNode(false);
      setDraggedNode(null);
    }
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const node = getNodeAtPosition(touch.clientX, touch.clientY);
      if (node) {
        setIsDraggingNode(true);
        setDraggedNode(node);
      } else {
        setIsDragging(true);
      }
      setLastPos({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      setLastPos({ x: dist, y: 0 });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      if (isDraggingNode && draggedNode) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const x = (touch.clientX - rect.left - offset.x) / scale / dimensions.width;
        const y = (touch.clientY - rect.top - offset.y) / scale / dimensions.height;
        
        const clampedX = Math.max(0.05, Math.min(0.95, x));
        const clampedY = Math.max(0.05, Math.min(0.95, y));
        
        setNodePositions(prev => {
          const next = new Map(prev);
          next.set(draggedNode.id, { x: clampedX, y: clampedY });
          return next;
        });
      } else if (isDragging) {
        setOffset(prev => ({
          x: prev.x + (touch.clientX - lastPos.x),
          y: prev.y + (touch.clientY - lastPos.y),
        }));
      }
      setLastPos({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const delta = dist / lastPos.x;
      const newScale = Math.max(0.3, Math.min(3, scale * delta));
      setScale(newScale);
      setLastPos({ x: dist, y: 0 });
    }
  };

  const handleTouchEnd = () => {
    if (isDraggingNode && draggedNode) {
      setIsDraggingNode(false);
      setDraggedNode(null);
    }
    setIsDragging(false);
  };

  const resetView = () => {
    setOffset({ x: 0, y: 0 });
    setScale(1);
    setNodePositions(new Map());
  };

  const getCursor = () => {
    if (isDraggingNode) return "grabbing";
    if (hoveredNode) return "grab";
    if (isDragging) return "grabbing";
    return "grab";
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-[#0b0e11]">
<canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ display: "block", cursor: getCursor(), touchAction: "none" }}
        />
      
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={resetView}
          className="px-3 py-1.5 bg-[#1e2329] rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#2b3139] transition-colors"
        >
          Reset View
        </button>
        <div className="px-3 py-1.5 bg-[#1e2329] rounded-lg text-xs text-gray-400">
          {Math.round(scale * 100)}%
        </div>
      </div>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <div className="flex gap-3 text-xs bg-[#0b0e11]/90 backdrop-blur-sm rounded-lg p-3 border border-[#1e2329]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
            <span className="text-gray-400">Pumping</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#fbbf24]" />
            <span className="text-gray-400">Stable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#f6465d]" />
            <span className="text-gray-400">Dumping</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-[#0b0e11]/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-[#1e2329]">
          <Move className="w-3 h-3" />
          <span>Drag tokens to rearrange</span>
        </div>
      </div>

      {hoveredNode && !isDraggingNode && (
        <div 
          className="absolute pointer-events-none bg-[#1e2329] border border-[#2b3139] rounded-xl p-4 shadow-2xl min-w-[220px] z-10"
          style={{
            left: Math.min(dimensions.width - 240, Math.max(10, hoveredNode.x * dimensions.width * scale + offset.x + 40)),
            top: Math.min(dimensions.height - 200, Math.max(10, hoveredNode.y * dimensions.height * scale + offset.y - 80)),
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            {hoveredNode.logoUrl ? (
              <img 
                src={hoveredNode.logoUrl} 
                alt={hoveredNode.label}
                className="w-12 h-12 rounded-full border-2 border-[#2b3139]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: hoveredNode.color }}
              >
                {hoveredNode.label.charAt(0)}
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-white">{hoveredNode.label}</div>
              <div className="text-xs text-gray-500 max-w-[140px] truncate">{hoveredNode.metadata?.name}</div>
            </div>
          </div>
          
          {hoveredNode.metadata?.priceChange !== undefined && (
            <div className="flex items-center gap-2 mb-3 bg-[#0b0e11] rounded-lg p-2">
              {hoveredNode.metadata.priceChange >= 0 ? (
                <TrendingUp className="w-5 h-5 text-[#02c076]" />
              ) : (
                <TrendingDown className="w-5 h-5 text-[#f6465d]" />
              )}
              <span className={cn(
                "text-lg font-bold",
                hoveredNode.metadata.priceChange >= 0 ? "text-[#02c076]" : "text-[#f6465d]"
              )}>
                {hoveredNode.metadata.priceChange >= 0 ? "+" : ""}
                {hoveredNode.metadata.priceChange.toFixed(2)}%
              </span>
              <span className="text-xs text-gray-500">24h</span>
            </div>
          )}
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Volume 24h</span>
              <span className="text-white font-medium">${formatNumber(hoveredNode.volume || 0)}</span>
            </div>
            {hoveredNode.metadata?.marketCap > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Market Cap</span>
                <span className="text-white font-medium">${formatNumber(hoveredNode.metadata.marketCap)}</span>
              </div>
            )}
            {hoveredNode.metadata?.price > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Price</span>
                <span className="text-white font-medium">
                  ${hoveredNode.metadata.price < 0.0001 
                    ? hoveredNode.metadata.price.toExponential(2) 
                    : hoveredNode.metadata.price.toFixed(6)}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-[#2b3139] flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Click to trade</span>
            <div className="flex items-center gap-1 text-[10px] text-[#02c076]">
              <span>Open</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
