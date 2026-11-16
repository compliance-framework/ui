/**
 * Layered layout for a dependency graph (FlowGraph): each node goes in a column by how many steps
 * follow it, so every edge points right; nodes in a column are ordered by their parents' rows and
 * centred against the tallest column. Ported from the classic workflow step graph.
 */

export interface FlowLayoutInput {
  id: string;
  order: number;
  /** Ids of the nodes this one depends on (edges run from each of them to this node). */
  dependsOn: string[];
}

export interface FlowLayoutNode {
  id: string;
  x: number;
  y: number;
  column: number;
}

export interface FlowLayoutEdge {
  from: string;
  to: string;
  path: string;
}

export interface FlowLayout {
  nodes: FlowLayoutNode[];
  edges: FlowLayoutEdge[];
  width: number;
  height: number;
}

export const FLOW_NODE = { width: 240, height: 96 } as const;
const GAP = { x: 96, y: 32 } as const;
const PADDING = 16;

function knownParents(node: FlowLayoutInput, ids: Set<string>): string[] {
  return node.dependsOn.filter((id) => id && ids.has(id) && id !== node.id);
}

export function layoutFlow(input: FlowLayoutInput[]): FlowLayout {
  if (!input.length) return { nodes: [], edges: [], width: 0, height: 0 };
  const ids = new Set(input.map((n) => n.id));
  const parents = new Map(input.map((n) => [n.id, knownParents(n, ids)]));
  const children = new Map<string, Set<string>>(
    input.map((n) => [n.id, new Set()]),
  );
  for (const n of input)
    for (const p of parents.get(n.id)!) children.get(p)!.add(n.id);

  // How many steps follow each node, guarding against cycles.
  const downstream = new Map<string, number>();
  const depth = (id: string, visiting: Set<string>): number => {
    if (downstream.has(id)) return downstream.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const kids = [...children.get(id)!];
    const d = kids.length
      ? Math.max(...kids.map((k) => depth(k, visiting))) + 1
      : 0;
    visiting.delete(id);
    downstream.set(id, d);
    return d;
  };
  input.forEach((n) => depth(n.id, new Set()));
  const maxDepth = Math.max(...downstream.values());

  const column = new Map(
    input.map((n) => [n.id, maxDepth - downstream.get(n.id)!]),
  );
  // A leaf sits just after its latest parent rather than at the far right.
  for (const n of input) {
    const ps = parents.get(n.id)!;
    if (children.get(n.id)!.size || !ps.length) continue;
    const next = Math.max(...ps.map((p) => column.get(p)!)) + 1;
    column.set(n.id, Math.min(column.get(n.id)!, next));
  }

  const columns = new Map<number, FlowLayoutInput[]>();
  for (const n of input) {
    const c = column.get(n.id)!;
    columns.set(c, [...(columns.get(c) ?? []), n]);
  }
  const tallest = Math.max(...[...columns.values()].map((c) => c.length));
  const rowHeight = FLOW_NODE.height + GAP.y;

  const placed = new Map<string, FlowLayoutNode>();
  const sortKey = (n: FlowLayoutInput) => {
    const ys = parents
      .get(n.id)!
      .map((p) => placed.get(p)?.y)
      .filter((y): y is number => y !== undefined);
    return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : n.order;
  };
  for (const c of [...columns.keys()].sort((a, b) => a - b)) {
    const sorted = columns
      .get(c)!
      .slice()
      .sort((a, b) => sortKey(a) - sortKey(b) || a.order - b.order);
    const top = ((tallest - sorted.length) * rowHeight) / 2 + PADDING;
    sorted.forEach((n, i) =>
      placed.set(n.id, {
        id: n.id,
        column: c,
        x: PADDING + c * (FLOW_NODE.width + GAP.x),
        y: top + i * rowHeight,
      }),
    );
  }

  // Spread several edges leaving (or entering) one node down its side.
  const anchor = (node: FlowLayoutNode, index: number, total: number) =>
    node.y + (FLOW_NODE.height / (total + 1)) * (index + 1);
  const outCount = new Map<string, number>();
  const edges: FlowLayoutEdge[] = [];
  for (const n of input) {
    const ps = parents.get(n.id)!;
    ps.forEach((p, inIndex) => {
      const from = placed.get(p)!;
      const to = placed.get(n.id)!;
      const outIndex = outCount.get(p) ?? 0;
      outCount.set(p, outIndex + 1);
      const x1 = from.x + FLOW_NODE.width;
      const y1 = anchor(from, outIndex, children.get(p)!.size);
      const y2 = anchor(to, inIndex, ps.length);
      const mid = (x1 + to.x) / 2;
      edges.push({
        from: p,
        to: n.id,
        path: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${to.x} ${y2}`,
      });
    });
  }

  const nodes = input.map((n) => placed.get(n.id)!);
  return {
    nodes,
    edges,
    width: Math.max(...nodes.map((n) => n.x)) + FLOW_NODE.width + PADDING,
    height: Math.max(...nodes.map((n) => n.y)) + FLOW_NODE.height + PADDING,
  };
}
