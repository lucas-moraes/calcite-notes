import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink } from '../types';

interface GraphViewProps {
  nodes: GraphNode[];
  links: GraphLink[];
  onNodeClick: (id: string) => void;
  activeNodeId?: string;
}

export default function GraphView({ nodes, links, onNodeClick, activeNodeId }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--color-base-600)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)
      .on('click', (event, d) => onNodeClick(d.id));

    node.append('circle')
      .attr('r', (d) => (d.id === activeNodeId ? 6 : 4))
      .attr('fill', (d) => (d.id === activeNodeId ? 'var(--color-accent)' : 'var(--color-base-400)'))
      .attr('stroke', 'var(--color-base-200)')
      .attr('stroke-width', 1.5)
      .attr('class', 'transition-all duration-300');

    node.append('text')
      .attr('dx', 10)
      .attr('dy', 4)
      .text((d) => d.name)
      .attr('fill', (d) => (d.id === activeNodeId ? 'var(--color-base-100)' : 'var(--color-base-500)'))
      .attr('font-size', '10px')
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
      simulation.force('center', d3.forceCenter(w / 2, h / 2));
      simulation.alpha(0.3).restart();
    });

    resizeObserver.observe(svgRef.current);

    return () => {
      simulation.stop();
      resizeObserver.disconnect();
    };
  }, [nodes, links, activeNodeId]);

  return (
    <div className="w-full h-full bg-base-950 dark:bg-base-950 light:bg-base-100 relative overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
      />
    </div>
  );
}
