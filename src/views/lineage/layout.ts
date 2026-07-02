// dagre layered layout for the lineage DAG. Kept separate from the view so it can
// be unit-tested and reused. Nodes flow top→bottom (standard roots at the top,
// evidence/operational leaves at the bottom).

import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@vue-flow/core';

export const NODE_WIDTH = 320;
export const NODE_HEIGHT = 68;

/**
 * Assign x/y positions to every node using dagre. Returns a NEW array of nodes
 * with `position` set (source nodes/edges are not mutated). Edges only need
 * source/target ids.
 */
export function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 40,
    ranksep: 70,
    marginx: 20,
    marginy: 20,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    // Guard against edges that reference a node not (yet) in the graph.
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      // dagre gives the node centre; Vue Flow positions from the top-left corner.
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
    };
  });
}
