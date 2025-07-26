import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Node, Edge, Controls, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { ChatOverlay } from './components/ChatOverlay';

// Initialize Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Node types with proper CSS types
const nodeTypes = {
  goal: {
    style: {
      background: '#10b981',
      color: 'white',
      border: '2px solid #059669',
      borderRadius: '50%',
      padding: '10px',
      fontSize: '12px',
      fontWeight: 'bold' as const,
      width: '120px',
      height: '120px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center' as const,
    },
  },
  project: {
    style: {
      background: '#3b82f6',
      color: 'white',
      border: '2px solid #2563eb',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
      fontWeight: 'bold' as const,
      width: '120px',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center' as const,
    },
  },
  tempEntity: {
    style: {
      background: 'transparent',
      color: '#e5e7eb',
      border: '2px dashed #9ca3af',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
      width: '120px',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center' as const,
    },
  },
};

// Custom node component
function CustomNode({ data, type }: { data: any; type: keyof typeof nodeTypes }) {
  const style = nodeTypes[type]?.style || nodeTypes.tempEntity.style;

  return (
    <div style={style}>
      <div>{data.label}</div>
    </div>
  );
}

function LifeGraph({ threadId }: { threadId: string }) {
  const visualizationData = useQuery(api.chat.getVisualizationData, { threadId });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Convert visualization data to ReactFlow nodes and edges
  useEffect(() => {
    if (!visualizationData) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Add goals as nodes
    visualizationData.goals.forEach((goal: any) => {
      newNodes.push({
        id: goal.id,
        type: 'default',
        position: {
          x: (goal.coordinates.x + 10) * 50, // Scale coordinates
          y: (goal.coordinates.y + 10) * 50
        },
        data: {
          label: goal.name,
          description: goal.description,
          status: goal.status,
        },
        style: nodeTypes.goal.style as React.CSSProperties,
      });
    });

    // Add projects as nodes
    visualizationData.projects.forEach((project: any) => {
      newNodes.push({
        id: project.id,
        type: 'default',
        position: {
          x: (project.coordinates.x + 10) * 50,
          y: (project.coordinates.y + 10) * 50
        },
        data: {
          label: project.name,
          description: project.description,
          status: project.status,
        },
        style: nodeTypes.project.style as React.CSSProperties,
      });

      // Add edges from projects to goals
      project.goalIds.forEach((goalId: string) => {
        newEdges.push({
          id: `${project.id}-${goalId}`,
          source: project.id,
          target: goalId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#6b7280', strokeWidth: 2 },
        });
      });
    });

    // Add temp entities as nodes
    visualizationData.tempEntities.forEach((entity: any) => {
      newNodes.push({
        id: entity.id,
        type: 'default',
        position: {
          x: (entity.coordinates.x + 10) * 50,
          y: (entity.coordinates.y + 10) * 50
        },
        data: {
          label: entity.name,
          description: entity.description,
          type: entity.type,
        },
        style: nodeTypes.tempEntity.style as React.CSSProperties,
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [visualizationData]);

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: any) => setEdges((edgs) => applyEdgeChanges(changes, edgs)),
    [],
  );

  const onConnect = useCallback(
    (params: any) => setEdges((edgs) => addEdge(params, edgs)),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      nodeTypes={{
        custom: CustomNode as any,
      }}
    >
      <Background color="#374151" gap={16} />
      <Controls />
    </ReactFlow>
  );
}

function App() {
  const [threadId, setThreadId] = useState<string | null>(null);

  return (
    <ConvexProvider client={convex}>
      <div style={{ width: '100vw', height: '100vh', background: '#111827', position: 'relative' }}>
        {/* Full screen graph */}
        <div style={{ width: '100%', height: '100%' }}>
          {threadId ? (
            <LifeGraph threadId={threadId} />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#9ca3af',
              fontSize: '18px',
            }}>
              Start a conversation to see your life map
            </div>
          )}
        </div>

        {/* Chat overlay */}
        <ChatOverlay onThreadIdChange={setThreadId} />
      </div>
    </ConvexProvider>
  );
}

export default App;