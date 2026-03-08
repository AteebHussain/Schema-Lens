import * as d3 from "d3";
import type { Table, Relationship } from "@/src/lib/parser";

// ── Types ──────────────────────────────────────────────────────────────────
export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  table: Table;
  width: number;
  height: number;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  relationship: Relationship;
}

// ── Layout Constants ──────────────────────────────────────────────────────
const NODE_WIDTH = 220;
const HEADER_HEIGHT = 36;
const ROW_HEIGHT = 26;
const NODE_PADDING = 12;

export function calculateNodeHeight(table: Table): number {
  return HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + NODE_PADDING;
}

// ── Build Graph Data ──────────────────────────────────────────────────────
export function buildGraphData(
  tables: Table[],
  relationships: Relationship[]
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = tables.map((table, i) => ({
    id: table.name,
    table,
    width: NODE_WIDTH,
    height: calculateNodeHeight(table),
    // Initial positions in a grid to avoid all starting at (0,0)
    x: (i % 4) * 300 + 100,
    y: Math.floor(i / 4) * 300 + 100,
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id.toLowerCase(), n]));

  const links: GraphLink[] = relationships
    .map((rel) => {
      const source = nodeMap.get(rel.sourceTable.toLowerCase());
      const target = nodeMap.get(rel.targetTable.toLowerCase());
      if (!source || !target) return null;
      return { source, target, relationship: rel } as GraphLink;
    })
    .filter(Boolean) as GraphLink[];

  return { nodes, links };
}

// ── Force Simulation ────────────────────────────────────────────────────
export function createSimulation(
  nodes: GraphNode[],
  links: GraphLink[],
  width: number,
  height: number
): d3.Simulation<GraphNode, GraphLink> {
  return d3
    .forceSimulation<GraphNode>(nodes)
    .force(
      "link",
      d3
        .forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance(280)
        .strength(0.5)
    )
    .force("charge", d3.forceManyBody().strength(-800))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3
        .forceCollide<GraphNode>()
        .radius((d) => Math.max(d.width, d.height) / 2 + 30)
    )
    .alphaDecay(0.02);
}

// ── Edge path calculation ──────────────────────────────────────────────
export function calculateEdgePath(
  source: GraphNode,
  target: GraphNode
): string {
  const sx = source.x ?? 0;
  const sy = source.y ?? 0;
  const tx = target.x ?? 0;
  const ty = target.y ?? 0;

  // Calculate connection points on the edges of the rectangles
  const dx = tx - sx;
  const dy = ty - sy;
  const angle = Math.atan2(dy, dx);

  const sHalfW = source.width / 2;
  const sHalfH = source.height / 2;
  const tHalfW = target.width / 2;
  const tHalfH = target.height / 2;

  // Source edge point
  const sEdge = getRectEdgePoint(sx, sy, sHalfW, sHalfH, angle);
  // Target edge point (opposite direction)
  const tEdge = getRectEdgePoint(tx, ty, tHalfW, tHalfH, angle + Math.PI);

  // Slight curve for visual clarity
  const midX = (sEdge.x + tEdge.x) / 2;
  const midY = (sEdge.y + tEdge.y) / 2;
  const offset = 20;
  const perpX = midX + Math.cos(angle + Math.PI / 2) * offset;
  const perpY = midY + Math.sin(angle + Math.PI / 2) * offset;

  return `M ${sEdge.x} ${sEdge.y} Q ${perpX} ${perpY} ${tEdge.x} ${tEdge.y}`;
}

function getRectEdgePoint(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  angle: number
): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const absCos = Math.abs(cos);
  const absSin = Math.abs(sin);

  let x: number, y: number;
  if (absCos * halfH > absSin * halfW) {
    // Intersects left or right edge
    const sign = cos > 0 ? 1 : -1;
    x = cx + sign * halfW;
    y = cy + (sin / cos) * sign * halfW;
  } else {
    // Intersects top or bottom edge
    const sign = sin > 0 ? 1 : -1;
    x = cx + (cos / sin) * sign * halfH;
    y = cy + sign * halfH;
  }
  return { x, y };
}

// ── Cardinality markers ──────────────────────────────────────────────────
export function getCardinalityLabel(cardinality: string): { source: string; target: string } {
  switch (cardinality) {
    case "1:1":
      return { source: "1", target: "1" };
    case "1:N":
      return { source: "N", target: "1" };
    case "M:N":
      return { source: "M", target: "N" };
    default:
      return { source: "", target: "" };
  }
}
