import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink } from '../types';
import { Plus, Minus, RotateCcw, Maximize2 } from 'lucide-react';

interface GraphViewProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick: (id: string) => void;
  activeNodeId?: string;
}

export default function GraphView({ nodes, links, onNodeClick, activeNodeId }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

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
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--color-base-600)')
      .attr('stroke-opacity', 0)
      .attr('stroke-width', 1);

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
      .attr('r', (d) => (d.id === activeNodeId ? 8 : 5))
      .attr('fill', (d) => (d.id === activeNodeId ? 'var(--color-accent)' : 'var(--color-base-400)'))
      .attr('stroke', 'var(--color-base-200)')
      .attr('stroke-width', 1.5)
      .style('filter', (d) => d.id === activeNodeId ? 'drop-shadow(0 0 8px var(--color-accent))' : 'none')
      .on('mouseenter', function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill', 'var(--color-accent)')
          .attr('r', 8)
          .style('filter', 'drop-shadow(0 0 8px var(--color-accent))');
      })
      .on('mouseleave', function(event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill', d.id === activeNodeId ? 'var(--color-accent)' : 'var(--color-base-400)')
          .attr('r', d.id === activeNodeId ? 8 : 5)
          .style('filter', d.id === activeNodeId ? 'drop-shadow(0 0 8px var(--color-accent))' : 'none');
      });

    node.append('text')
      .attr('dx', 12)
      .attr('dy', 4)
      .text((d) => d.name)
      .attr('fill', (d) => (d.id === activeNodeId ? 'var(--color-base-100)' : 'var(--color-base-500)'))
      .attr('font-size', '10px')
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

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

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
    };
  }, [nodes, links, activeNodeId, onNodeClick]);

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

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden" style={{ 
      backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(201, 139, 90, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(201, 139, 90, 0.04) 0%, transparent 50%)' 
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
      <div className="absolute top-3 right-3 flex flex-col gap-1 bg-base-800/80 backdrop-blur-sm rounded-lg p-1 z-50" style={{ pointerEvents: 'auto' }}>
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