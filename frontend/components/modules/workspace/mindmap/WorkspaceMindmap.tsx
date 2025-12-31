"use client";

import { useMemo, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

import { nodeTypes } from "./MindmapNodes";
import type { ResearchPaper } from "@/lib/types/database";

// ============================================
// Dagre Layout Configuration
// ============================================
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const NODE_WIDTH = 220;
const NODE_HEIGHT = 80;

function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
) {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ============================================
// Props Interface
// ============================================
interface WorkspaceMindmapProps {
  projectTitle: string;
  papers: ResearchPaper[];
  keyInsights: string[];
}

// ============================================
// Main Component
// ============================================
export default function WorkspaceMindmap({
  projectTitle,
  papers,
  keyInsights,
}: WorkspaceMindmapProps) {
  // Generate nodes and edges from data
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // 1. Topic Node (Center)
    nodes.push({
      id: "topic",
      type: "topic",
      position: { x: 0, y: 0 },
      data: { label: projectTitle || "Research Topic" },
    });

    // 2. Paper Nodes
    papers.slice(0, 8).forEach((paper, index) => {
      const paperId = `paper-${index}`;
      nodes.push({
        id: paperId,
        type: "paper",
        position: { x: 0, y: 0 },
        data: {
          label: paper.title,
          authors:
            paper.authors?.slice(0, 50) +
            (paper.authors && paper.authors.length > 50 ? "..." : ""),
          year: paper.year,
          citationCount: paper.citation_count,
        },
      });

      // Edge from topic to paper
      edges.push({
        id: `topic-${paperId}`,
        source: "topic",
        target: paperId,
        animated: true,
        style: { stroke: "#10b981", strokeWidth: 2 },
      });
    });

    // 3. Key Insight Nodes
    keyInsights.slice(0, 6).forEach((insight, index) => {
      const insightId = `insight-${index}`;
      nodes.push({
        id: insightId,
        type: "insight",
        position: { x: 0, y: 0 },
        data: {
          label: insight.length > 100 ? insight.slice(0, 100) + "..." : insight,
          index,
        },
      });

      // Connect insights to papers if we have papers
      if (papers.length > 0) {
        const paperIndex = index % Math.min(papers.length, 8);
        edges.push({
          id: `paper-${paperIndex}-${insightId}`,
          source: `paper-${paperIndex}`,
          target: insightId,
          style: { stroke: "#f59e0b", strokeWidth: 2 },
        });
      } else {
        // Connect directly to topic if no papers
        edges.push({
          id: `topic-${insightId}`,
          source: "topic",
          target: insightId,
          style: { stroke: "#f59e0b", strokeWidth: 2 },
        });
      }
    });

    // Apply dagre layout
    const layouted = getLayoutedElements(nodes, edges, "TB");
    return { initialNodes: layouted.nodes, initialEdges: layouted.edges };
  }, [projectTitle, papers, keyInsights]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Recompute layout on demand
  const onLayout = useCallback(
    (direction: "TB" | "LR") => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction);
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges, setNodes, setEdges]
  );

  return (
    <div className="w-full h-[600px] bg-muted/30 rounded-xl border border-border overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="!bg-background [&>pattern>circle]:fill-muted-foreground/20"
        />
        <Controls className="bg-background border-border [&>button]:bg-background [&>button]:border-border [&>button]:text-foreground [&>button:hover]:bg-muted" />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case "topic":
                return "#3b82f6";
              case "paper":
                return "#10b981";
              case "insight":
                return "#f59e0b";
              default:
                return "#64748b";
            }
          }}
          maskColor="hsl(var(--background) / 0.8)"
          className="bg-muted border-border"
        />
      </ReactFlow>

      {/* Layout Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => onLayout("TB")}
          className="px-3 py-1.5 text-xs font-medium bg-background hover:bg-muted text-foreground border border-border rounded-md transition-colors shadow-sm"
        >
          Vertical
        </button>
        <button
          onClick={() => onLayout("LR")}
          className="px-3 py-1.5 text-xs font-medium bg-background hover:bg-muted text-foreground border border-border rounded-md transition-colors shadow-sm"
        >
          Horizontal
        </button>
      </div>
    </div>
  );
}
