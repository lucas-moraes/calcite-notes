import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink } from '../types';
import { Plus, Minus, RotateCcw } from 'lucide-react';

interface GraphViewProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick: (id: string) => void;
  activeNodeId?: string;
}

const CLUSTER_COLORS = [
  '#6366f1', // Indigo
  '#22d3ee', // Cyan
  '#f472b6', // Pink
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#a78bfa', // Violet
  '#fb7185', // Rose
  '#2dd4bf', // Teal
];

function findClusters(nodes: GraphNode[], links: GraphLink[]): Map<string, number> {
  const adjacency = new Map<string, Set<string>>();
  
  nodes.forEach(n => adjacency.set(n.id, new Set()));
  links.forEach(l => {
    if (adjacency.has(l.source) && adjacency.has(l.target)) {
      adjacency.get(l.source)!.add(l.target);
      adjacency.get(l.target)!.add(l.source);
    }
  });

  const visited = new Set<string>();
  const clusterMap = new Map<string, number>();
  let clusterId = 0;

  nodes.forEach(node => {
    if (visited.has(node.id)) return;

    const queue = [node.id];
    visited.add(node.id);
    clusterMap.set(node.id, clusterId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current);
      if (neighbors) {
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            clusterMap.set(neighbor, clusterId);
            queue.push(neighbor);
          }
        });
      }
    }
    clusterId++;
  });

  return clusterMap;
}

export default function GraphView({ nodes, links, onNodeClick, activeNodeId }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [zoom, setZoom] = useState(1);

  const clusterMap = useMemo(() => findClusters(nodes, links), [nodes, links]);

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

    const nodesWithClusters = nodes.map(n => ({
      ...n,
      cluster: clusterMap.get(n.id) ?? -1
    }));

    const simulation = d3.forceSimulation(nodesWithClusters as any)
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(80)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('collide', d3.forceCollide().radius(30))
      .force('cluster', (alpha) => {
        const clusterCenters = new Map<number, { x: number; y: number; count: number }>();
        
        nodesWithClusters.forEach((d: any) => {
          if (d.cluster === -1) return;
          if (!clusterCenters.has(d.cluster)) {
            clusterCenters.set(d.cluster, { x: 0, y: 0, count: 0 });
          }
          const center = clusterCenters.get(d.cluster)!;
          center.x += d.x || 0;
          center.y += d.y || 0;
          center.count++;
        });

        clusterCenters.forEach((center, clusterId) => {
          center.x /= center.count;
          center.y /= center.count;
        });

        const clusterSpacing = 250;
        const cols = Math.ceil(Math.sqrt(clusterCenters.size));
        
        let col = 0, row = 0;
        clusterCenters.forEach((center, clusterId) => {
          const targetX = width / 2 + (col - cols / 2) * clusterSpacing;
          const targetY = height / 2 + (row - cols / 2) * clusterSpacing;
          
          nodesWithClusters.forEach((d: any) => {
            if (d.cluster === clusterId) {
              d.vx! += (targetX - center.x) * alpha * 0.1;
              d.vy! += (targetY - center.y) * alpha * 0.1;
            }
          });
          
          col++;
          if (col >= cols) {
            col = 0;
            row++;
          }
        });
      });

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--color-base-600)')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    const node = g.append('g')
      .selectAll('g')
      .data(nodesWithClusters)
      .join('g')
      .attr('class', 'cursor-pointer')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d.id);
      });

    node.append('circle')
      .attr('r', (d: any) => (d.id === activeNodeId ? 10 : 6))
      .attr('fill', (d: any) => {
        if (d.id === activeNodeId) return 'var(--color-accent)';
        if (d.cluster === -1) return 'var(--color-base-500)';
        return CLUSTER_COLORS[d.cluster % CLUSTER_COLORS.length];
      })
      .attr('stroke', (d: any) => d.id === activeNodeId ? 'var(--color-base-100)' : 'transparent')
      .attr('stroke-width', 2)
      .style('filter', (d: any) => d.id === activeNodeId ? 'drop-shadow(0 0 8px var(--color-accent))' : 'none');

    node.append('text')
      .attr('dx', 14)
      .attr('dy', 4)
      .text((d: any) => d.name)
      .attr('fill', (d: any) => (d.id === activeNodeId ? 'var(--color-base-100)' : 'var(--color-base-400)'))
      .attr('font-size', '11px')
      .attr('font-weight', (d: any) => d.id === activeNodeId ? '600' : '400')
      .attr('class', 'pointer-events-none select-none');

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
      simulation.alpha(0.3).restart();
    });

    resizeObserver.observe(svgRef.current);

    return () => {
      simulation.stop();
      resizeObserver.disconnect();
    };
  }, [nodes, links, activeNodeId, onNodeClick, clusterMap]);

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
    <div ref={containerRef} className="w-full h-full bg-base-950 relative overflow-hidden">
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

      {/* Legend */}
      <div className="absolute bottom-3 left-3 text-xs text-base-500 font-mono bg-base-800/80 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-2">
        <span className="text-[10px] text-base-400">Clusters:</span>
        {CLUSTER_COLORS.slice(0, Math.min(clusterMap.size, 6)).map((color, i) => (
          <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        ))}
        {clusterMap.size === 0 && <span className="text-base-500">No connections</span>}
      </div>
    </div>
  );
}