"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

// ============================================
// Topic Node (Central - Main Research Topic)
// ============================================
export const TopicNode = memo(({ data }: NodeProps<{ label: string }>) => {
  return (
    <div className="px-6 py-4 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg border-2 border-blue-400 min-w-[200px] max-w-[300px]">
      <div className="font-bold text-center text-lg leading-tight">
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-300"
      />
    </div>
  );
});
TopicNode.displayName = "TopicNode";

// ============================================
// Paper Node (Research Paper)
// ============================================
interface PaperNodeData {
  label: string;
  authors?: string;
  year?: number;
  citationCount?: number;
}

export const PaperNode = memo(({ data }: NodeProps<PaperNodeData>) => {
  return (
    <div className="px-4 py-3 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md border border-emerald-400 min-w-[180px] max-w-[250px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-emerald-300"
      />
      <div className="font-semibold text-sm leading-tight line-clamp-2">
        {data.label}
      </div>
      {data.authors && (
        <div className="text-xs text-emerald-100 mt-1 truncate">
          {data.authors}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 text-xs text-emerald-200">
        {data.year && <span>{data.year}</span>}
        {data.citationCount !== undefined && (
          <span className="bg-emerald-700/50 px-1.5 py-0.5 rounded">
            {data.citationCount} citations
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-emerald-300"
      />
    </div>
  );
});
PaperNode.displayName = "PaperNode";

// ============================================
// Insight Node (Key Insight)
// ============================================
interface InsightNodeData {
  label: string;
  index?: number;
}

export const InsightNode = memo(({ data }: NodeProps<InsightNodeData>) => {
  return (
    <div className="px-4 py-3 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md border border-amber-400 min-w-[160px] max-w-[220px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-amber-300"
      />
      {data.index !== undefined && (
        <div className="text-xs font-bold text-amber-200 mb-1">
          Insight #{data.index + 1}
        </div>
      )}
      <div className="text-sm leading-tight line-clamp-3">{data.label}</div>
    </div>
  );
});
InsightNode.displayName = "InsightNode";

// Export node types map for React Flow
export const nodeTypes = {
  topic: TopicNode,
  paper: PaperNode,
  insight: InsightNode,
};
