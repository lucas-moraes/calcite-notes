import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink } from '../types';
import { Plus, Minus, RotateCcw, Maximize2 } from 'lucide-react';

interface GraphViewProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick: (id: string) => void;
  activeNodeId?: string;
  centerOnActive?: boolean;
}

export default function GraphView({ nodes, links, onNodeClick, activeNodeId, centerOnActive }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [zoom, setZoom] = useState(1);
  const isLight = document.documentElement.classList.contains('light');

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const tagFill = isLight ? '#6366f1' : '#e0e7ff';
    const tagFillHover = isLight ? '#4f46e5' : '#f0f4ff';
    const tagGlow = isLight ? 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.5))' : 'drop-shadow(0 0 8px #c7d2fe) drop-shadow(0 0 16px rgba(199, 210, 254, 0.4))';
    const tagGlowHover = isLight ? 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.7))' : 'drop-shadow(0 0 12px #e0e7ff) drop-shadow(0 0 20px rgba(224, 231, 255, 0.5))';
    const tagPulseStroke = isLight ? '#818cf8' : '#c7d2fe';
    const tagLinkColor = isLight ? '#818cf8' : '#c7d2fe';
    const tagNodeTextColor = isLight ? '#312e81' : 'var(--color-base-500)';
    const tagStrokeOutline = isLight ? 'var(--color-base-100)' : 'var(--color-base-950)';

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const g = svg.append('g');

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.08))
      .force('y', d3.forceY(height / 2).strength(0.08))
      .force('collision', d3.forceCollide().radius((d: any) => {
        const textLength = (d.name?.length || 0) * 5.5 + 24;
        return Math.max(25, textLength / 2 + 8);
      }))
      .alpha(1)
      .restart();

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    const tagPulseGroup = g.append('g').attr('class', 'tag-pulse-group');
    const tagPulseIntervals: number[] = [];

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d: any) => d.type === 'tag' ? tagLinkColor : 'var(--color-base-600)')
      .attr('stroke-opacity', 0)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', (d: any) => d.type === 'tag' ? '4,4' : 'none');

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer')
      .attr('opacity', 0)
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d.id);
      });

    node.append('circle')
      .attr('r', (d) => (d as any).isTag ? 4 : (d.id === activeNodeId ? 8 : 5))
      .attr('fill', (d) => (d as any).isTag ? tagFill : (d.id === activeNodeId ? 'var(--color-accent)' : 'var(--color-base-400)'))
      .attr('stroke', 'none')
      .style('filter', (d) => (d as any).isTag ? tagGlow : (d.id === activeNodeId ? 'drop-shadow(0 0 8px var(--color-accent))' : 'none'))
      .on('mouseenter', function(event, d) {
        const isTag = (d as any).isTag;
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill', isTag ? tagFillHover : 'var(--color-accent)')
          .attr('r', isTag ? 6 : 8)
          .style('filter', isTag ? tagGlowHover : 'drop-shadow(0 0 8px var(--color-accent))');
      })
      .on('mouseleave', function(event, d) {
        const isTag = (d as any).isTag;
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill', isTag ? tagFill : (d.id === activeNodeId ? 'var(--color-accent)' : 'var(--color-base-400)'))
          .attr('r', isTag ? 4 : (d.id === activeNodeId ? 8 : 5))
          .style('filter', isTag ? tagGlow : (d.id === activeNodeId ? 'drop-shadow(0 0 8px var(--color-accent))' : 'none'));
      });

    nodes.forEach((tagNode, idx) => {
      if (!(tagNode as any).isTag) return;
      const delay = idx * 400;
      const animateTagPulse = () => {
        tagPulseGroup.append('circle')
          .attr('cx', (tagNode as any).x)
          .attr('cy', (tagNode as any).y)
          .attr('r', 4)
          .attr('fill', 'none')
          .attr('stroke', tagPulseStroke)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.7)
          .transition()
          .duration(2000)
          .ease(d3.easeQuadOut)
          .attr('r', 22)
          .attr('opacity', 0)
          .on('end', function() { d3.select(this).remove(); });
      };
      const timeout = setTimeout(() => {
        animateTagPulse();
        const interval = window.setInterval(animateTagPulse, 2200);
        tagPulseIntervals.push(interval);
      }, delay);
      tagPulseIntervals.push(timeout as unknown as number);
    });

    node.append('text')
      .attr('dx', 12)
      .attr('dy', 4)
      .text((d) => d.name)
      .attr('fill', (d) => {
        if ((d as any).isTag) return tagNodeTextColor;
        return d.id === activeNodeId ? 'var(--color-base-100)' : 'var(--color-base-500)';
      })
      .attr('font-size', '10px')
      .attr('stroke', (d) => {
        if ((d as any).isTag && isLight) return 'none';
        return (d as any).isTag ? tagStrokeOutline : 'var(--color-base-950)';
      })
      .attr('stroke-width', (d) => ((d as any).isTag && isLight) ? 0 : 3)
      .attr('paint-order', 'stroke')
      .attr('stroke-linejoin', 'round')
      .attr('class', 'pointer-events-none select-none');

    // Animação de entrada
    node.transition()
      .delay((d, i) => i * 50)
      .duration(400)
      .attr('opacity', 1);

    link.transition()
      .delay((d, i) => nodes.length * 50 + i * 30)
      .duration(400)
      .attr('stroke-opacity', 0.6);

    // Animação de pulse para nó ativo
    const activeNode = nodes.find(n => n.id === activeNodeId);
    if (activeNode) {
      const pulseGroup = g.append('g').attr('class', 'pulse-group');
      
      const animatePulse = () => {
        pulseGroup.selectAll('circle')
          .data([activeNode])
          .join('circle')
          .attr('r', 8)
          .attr('fill', 'none')
          .attr('stroke', 'var(--color-accent)')
          .attr('stroke-width', 2)
          .attr('opacity', 0.8)
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y)
          .transition()
          .duration(1500)
          .ease(d3.easeLinear)
          .attr('r', 25)
          .attr('opacity', 0)
          .on('end', animatePulse);
      };
      
      animatePulse();
    }

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    const resizeObserver = new ResizeObserver(() => {
      const w = svgRef.current?.clientWidth || 0;
      const h = svgRef.current?.clientHeight || 0;
      simulation.force('center', d3.forceCenter(w / 2, h / 2));
      simulation.alpha(0.3).restart();
    });

    resizeObserver.observe(svgRef.current);

    return () => {
      simulation.stop();
      resizeObserver.disconnect();
      tagPulseIntervals.forEach((id) => window.clearInterval(id));
    };
  }, [nodes, links, activeNodeId, onNodeClick, isLight]);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
  };

  const handleReset = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  // Centralizar view no nó ativo
  useEffect(() => {
    if (!centerOnActive || !activeNodeId || !zoomBehaviorRef.current || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const timer = setTimeout(() => {
      const activeDatum = (nodes as any[]).find((n) => n.id === activeNodeId);
      if (!activeDatum || activeDatum.x == null || activeDatum.y == null) return;

      const w = svgRef.current?.clientWidth || 800;
      const h = svgRef.current?.clientHeight || 600;
      const scale = 1;
      const tx = w / 2 - activeDatum.x * scale;
      const ty = h / 2 - activeDatum.y * scale;
      const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);

      svg.transition().duration(400).call(zoomBehaviorRef.current.transform, transform);
      setZoom(scale);
    }, 500);

    return () => clearTimeout(timer);
  }, [centerOnActive, activeNodeId, nodes]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden" style={{ 
      backgroundImage: isLight 
        ? 'radial-gradient(ellipse at 30% 20%, rgba(79, 70, 229, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(99, 102, 241, 0.04) 0%, transparent 50%)'
        : 'radial-gradient(ellipse at 30% 20%, rgba(217, 119, 6, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(79, 70, 229, 0.05) 0%, transparent 50%)'
    }}>
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-base-700 border-t-accent animate-spin" />
            <span className="text-base-500 text-sm">Loading notes...</span>
          </div>
        </div>
      )}
      <svg ref={svgRef} className="w-full h-full" />
      
      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 bg-base-800/80 backdrop-blur-sm rounded-lg p-1 z-30" style={{ pointerEvents: 'auto' }}>
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-base-700 rounded text-base-400 hover:text-base-200 transition-colors"
          title="Zoom In"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-base-700 rounded text-base-400 hover:text-base-200 transition-colors"
          title="Zoom Out"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-base-700 rounded text-base-400 hover:text-base-200 transition-colors"
          title="Reset View"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 text-xs text-base-500 font-mono bg-base-800/80 backdrop-blur-sm px-2 py-1 rounded">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}