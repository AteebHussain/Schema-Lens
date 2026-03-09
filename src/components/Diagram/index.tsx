"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import * as d3 from "d3";
import { useSchemaStore } from "@/src/store/schemaStore";
import {
  buildGraphData,
  createSimulation,
  calculateEdgePath,
  getCardinalityLabel,
  type GraphNode,
  type GraphLink,
} from "./layoutEngine";

export default function Diagram() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);
  const activeRelationshipId = useSchemaStore((s) => s.activeRelationshipId);
  const setActiveRelationship = useSchemaStore((s) => s.setActiveRelationship);

  // Track dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Render D3 visualization
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || tables.length === 0) return;

    const { width, height } = dimensions;
    const { nodes, links } = buildGraphData(tables, relationships);

    // Clear previous content
    d3.select(svg).selectAll("*").remove();

    const svgSel = d3
      .select(svg)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Zoom
    const g = svgSel.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svgSel.call(zoom);

    // Defs for arrow markers & glow
    const defs = svgSel.append("defs");

    // Arrow marker
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 0 10 7")
      .attr("refX", 10)
      .attr("refY", 3.5)
      .attr("markerWidth", 8)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("polygon")
      .attr("points", "0 0, 10 3.5, 0 7")
      .attr("fill", "#3E3636");

    defs
      .append("marker")
      .attr("id", "arrowhead-active")
      .attr("viewBox", "0 0 10 7")
      .attr("refX", 10)
      .attr("refY", 3.5)
      .attr("markerWidth", 8)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("polygon")
      .attr("points", "0 0, 10 3.5, 0 7")
      .attr("fill", "#D72323");

    // Glow filter
    const filter = defs.append("filter").attr("id", "glow");
    filter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "blur");
    filter
      .append("feMerge")
      .selectAll("feMergeNode")
      .data(["blur", "SourceGraphic"])
      .enter()
      .append("feMergeNode")
      .attr("in", (d) => d);

    // Links
    const linkGroup = g.append("g").attr("class", "links");
    const linkPaths = linkGroup
      .selectAll("path")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "link-path")
      .attr("fill", "none")
      .attr("stroke", (d: GraphLink) =>
        d.relationship.id === activeRelationshipId ? "#D72323" : "#3E3636"
      )
      .attr("stroke-width", (d: GraphLink) =>
        d.relationship.id === activeRelationshipId ? 3 : 1.5
      )
      .attr("stroke-opacity", 0.7)
      .attr("marker-end", (d: GraphLink) =>
        d.relationship.id === activeRelationshipId
          ? "url(#arrowhead-active)"
          : "url(#arrowhead)"
      )
      .attr("cursor", "pointer")
      .on("click", (_event: MouseEvent, d: GraphLink) => {
        setActiveRelationship(d.relationship.id);
      });

    // Cardinality labels
    const cardLabels = linkGroup
      .selectAll("g.card-label")
      .data(links)
      .enter()
      .append("g")
      .attr("class", "card-label");

    // Source label
    cardLabels
      .append("text")
      .attr("class", "cardinality-text source-card")
      .attr("fill", "#F5EDED")
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("text-anchor", "middle")
      .text((d: GraphLink) => getCardinalityLabel(d.relationship.cardinality).source);

    // Target label
    cardLabels
      .append("text")
      .attr("class", "cardinality-text target-card")
      .attr("fill", "#a5b4fc")
      .attr("font-size", "11px")
      .attr("font-weight", "700")
      .attr("text-anchor", "middle")
      .text((d: GraphLink) => getCardinalityLabel(d.relationship.cardinality).target);

    // Nodes
    const nodeGroup = g.append("g").attr("class", "nodes");
    const nodeGs = nodeGroup
      .selectAll("g.node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("cursor", "grab")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulationRef.current?.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node background rectangles
    nodeGs
      .append("rect")
      .attr("class", "node-bg")
      .attr("width", (d) => d.width)
      .attr("height", (d) => d.height)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", "#120f0f")
      .attr("stroke", "#3E3636")
      .attr("stroke-width", 1);

    // Node header
    nodeGs
      .append("rect")
      .attr("class", "node-header")
      .attr("width", (d) => d.width)
      .attr("height", 36)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", "#1a1515");

    // Cover bottom corners of header
    nodeGs
      .append("rect")
      .attr("width", (d) => d.width)
      .attr("height", 12)
      .attr("y", 24)
      .attr("fill", "#1a1515");

    // Table name
    nodeGs
      .append("text")
      .attr("x", 12)
      .attr("y", 23)
      .attr("fill", "#F5EDED")
      .attr("font-size", "13px")
      .attr("font-weight", "700")
      .attr("font-family", "var(--font-geist-mono), monospace")
      .text((d) => d.table.name);

    // Column rows
    nodeGs.each(function (d) {
      const group = d3.select(this);
      d.table.columns.forEach((col, i) => {
        const y = 36 + i * 26 + 18;
        const isPK = col.isPrimaryKey;
        const isFK = d.table.foreignKeys.some((fk) =>
          fk.columns.includes(col.name)
        );

        // Badges
        if (isPK) {
          group
            .append("rect")
            .attr("x", 8)
            .attr("y", y - 10)
            .attr("width", 20)
            .attr("height", 14)
            .attr("rx", 3)
            .attr("fill", "#F5EDED")
            .attr("fill-opacity", 0.1);
          group
            .append("text")
            .attr("x", 18)
            .attr("y", y + 1)
            .attr("fill", "#F5EDED")
            .attr("font-size", "8px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .text("PK");
        }

        if (isFK) {
          group
            .append("rect")
            .attr("x", isPK ? 32 : 8)
            .attr("y", y - 10)
            .attr("width", 20)
            .attr("height", 14)
            .attr("rx", 3)
            .attr("fill", "#D72323")
            .attr("fill-opacity", 0.2);
          group
            .append("text")
            .attr("x", (isPK ? 32 : 8) + 10)
            .attr("y", y + 1)
            .attr("fill", "#D72323")
            .attr("font-size", "8px")
            .attr("font-weight", "700")
            .attr("text-anchor", "middle")
            .text("FK");
        }

        // Column name
        const nameX = isPK && isFK ? 58 : isPK || isFK ? 34 : 12;
        group
          .append("text")
          .attr("x", nameX)
          .attr("y", y)
          .attr("fill", isPK ? "#F5EDED" : isFK ? "#D72323" : "#b8a9a9")
          .attr("font-size", "11px")
          .attr("font-family", "var(--font-geist-mono), monospace")
          .text(col.name);

        // Data type
        group
          .append("text")
          .attr("x", d.width - 8)
          .attr("y", y)
          .attr("fill", "#6e5c5c")
          .attr("font-size", "10px")
          .attr("font-family", "var(--font-geist-mono), monospace")
          .attr("text-anchor", "end")
          .text(col.dataType);
      });
    });

    // Create simulation
    const simulation = createSimulation(nodes, links, width, height);
    simulationRef.current = simulation;

    simulation.on("tick", () => {
      // Update node positions
      nodeGs.attr("transform", (d) => `translate(${(d.x ?? 0) - d.width / 2},${(d.y ?? 0) - d.height / 2})`);

      // Update link paths
      linkPaths.attr("d", (d) => {
        const source = d.source as GraphNode;
        const target = d.target as GraphNode;
        return calculateEdgePath(source, target);
      });

      // Update cardinality label positions
      cardLabels.each(function (d) {
        const source = d.source as GraphNode;
        const target = d.target as GraphNode;
        const sx = source.x ?? 0;
        const sy = source.y ?? 0;
        const tx = target.x ?? 0;
        const ty = target.y ?? 0;

        const group = d3.select(this);
        group.select(".source-card").attr("x", sx + (tx - sx) * 0.2).attr("y", sy + (ty - sy) * 0.2 - 8);
        group.select(".target-card").attr("x", sx + (tx - sx) * 0.8).attr("y", sy + (ty - sy) * 0.8 - 8);
      });
    });

    return () => {
      simulation.stop();
    };
  }, [tables, relationships, activeRelationshipId, setActiveRelationship, dimensions]);

  const handleResetLayout = useCallback(() => {
    simulationRef.current?.alpha(1).restart();
  }, []);

  if (tables.length === 0) {
    return (
      <div className="diagram-empty">
        <div className="empty-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="4" y="8" width="16" height="12" rx="3" stroke="#3E3636" strokeWidth="2" fill="none" />
            <rect x="28" y="8" width="16" height="12" rx="3" stroke="#3E3636" strokeWidth="2" fill="none" />
            <rect x="16" y="28" width="16" height="12" rx="3" stroke="#3E3636" strokeWidth="2" fill="none" />
            <line x1="20" y1="20" x2="24" y2="28" stroke="#D72323" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="28" y1="20" x2="24" y2="28" stroke="#D72323" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
        </div>
        <p className="empty-title">No schema loaded</p>
        <p className="empty-subtitle">Paste SQL or load a sample to visualize your database</p>
      </div>
    );
  }

  return (
    <div className="diagram-container" ref={containerRef}>
      <div className="diagram-toolbar">
        <button onClick={handleResetLayout} className="toolbar-btn" title="Reset Layout">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 8a6 6 0 0111.46-2.46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M14 8a6 6 0 01-11.46 2.46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Reset
        </button>
        <span className="toolbar-info">
          {tables.length} table{tables.length !== 1 ? "s" : ""} · {relationships.length} relationship{relationships.length !== 1 ? "s" : ""}
        </span>
      </div>
      <svg ref={svgRef} className="diagram-svg" />
    </div>
  );
}
