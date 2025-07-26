import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Panel,
    useNodesState,
    useEdgesState,
    useReactFlow,
    useNodesInitialized,
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    NodeTypes,
} from '@xyflow/react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import GoalNode, { type GoalNode as GoalNodeType } from './nodes/GoalNode';
import ProjectNode, { type ProjectNode as ProjectNodeType } from './nodes/ProjectNode';
import TempEntityNode, { type TempEntityNode as TempEntityNodeType } from './nodes/TempEntityNode';

import '@xyflow/react/dist/style.css';

const nodeTypes: NodeTypes = {
    goal: GoalNode,
    project: ProjectNode,
    tempEntity: TempEntityNode,
};

type NodeType = GoalNodeType | ProjectNodeType | TempEntityNodeType;

interface LifeGraphProps {
    threadId?: string;
    onNodeSelect?: (nodeId: string, nodeData: any) => void;
    highlightedNodes?: Set<string>;
    selectedNode?: string | null;
}

function LifeGraphFlow({ threadId, onNodeSelect, highlightedNodes, selectedNode }: LifeGraphProps) {
    const { fitView } = useReactFlow();
    const initialized = useNodesInitialized();

    // Get visualization data
    const visualizationData = useQuery(api.visualization.getVisualizationData, {
        threadId: threadId || "",
    });

    const [nodes, setNodes, onNodesChange] = useNodesState<NodeType>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Convert data to React Flow nodes
    const flowNodes = useMemo(() => {
        if (!visualizationData) return [];

        const allNodes: NodeType[] = [];

        // Add goal nodes
        visualizationData.goals.forEach((goal) => {
            allNodes.push({
                id: goal._id,
                type: 'goal',
                position: {
                    x: goal.coordinates?.x || Math.random() * 500,
                    y: goal.coordinates?.y || Math.random() * 500
                },
                data: {
                    name: goal.name,
                    description: goal.description,
                    status: goal.status,
                },
                className: highlightedNodes?.has(goal._id) ? 'highlighted' : '',
            });
        });

        // Add project nodes
        visualizationData.projects.forEach((project) => {
            allNodes.push({
                id: project._id,
                type: 'project',
                position: {
                    x: project.coordinates?.x || Math.random() * 500,
                    y: project.coordinates?.y || Math.random() * 500
                },
                data: {
                    name: project.name,
                    description: project.description,
                    status: project.status,
                    completed: project.completed,
                },
                className: highlightedNodes?.has(project._id) ? 'highlighted' : '',
            });
        });

        // Add temp entity nodes
        visualizationData.tempEntities.forEach((entity) => {
            allNodes.push({
                id: entity._id,
                type: 'tempEntity',
                position: {
                    x: entity.coordinates?.x || Math.random() * 500,
                    y: entity.coordinates?.y || Math.random() * 500
                },
                data: {
                    name: entity.name,
                    description: entity.description,
                    type: entity.type,
                    similarityScores: entity.similarityScores,
                },
                className: highlightedNodes?.has(entity._id) ? 'highlighted' : '',
            });
        });

        return allNodes;
    }, [visualizationData, highlightedNodes]);

    // Convert data to React Flow edges
    const flowEdges = useMemo(() => {
        if (!visualizationData) return [];

        const allEdges: Edge[] = [];

        // Create edges from projects to their linked goals
        visualizationData.projects.forEach((project) => {
            project.goalIds.forEach((goalId) => {
                allEdges.push({
                    id: `${project._id}-${goalId}`,
                    source: project._id,
                    target: goalId,
                    type: 'smoothstep',
                    style: { stroke: '#6366f1', strokeWidth: 2 },
                    animated: false,
                });
            });

            // Create edges for parent-child project relationships
            if (project.parentProjectId) {
                allEdges.push({
                    id: `${project.parentProjectId}-${project._id}`,
                    source: project.parentProjectId,
                    target: project._id,
                    type: 'smoothstep',
                    style: { stroke: '#3b82f6', strokeWidth: 1 },
                    animated: false,
                });
            }
        });

        return allEdges;
    }, [visualizationData]);

    // Update nodes and edges when data changes
    useEffect(() => {
        setNodes(flowNodes);
        setEdges(flowEdges);
    }, [flowNodes, flowEdges, setNodes, setEdges]);

    // Fit view when nodes are initialized
    useEffect(() => {
        if (initialized && flowNodes.length > 0) {
            setTimeout(() => fitView({ duration: 1000 }), 100);
        }
    }, [initialized, flowNodes.length, fitView]);

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        onNodeSelect?.(node.id, node.data);
    }, [onNodeSelect]);

    if (!visualizationData) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-900 text-white">
                Loading your life graph...
            </div>
        );
    }

    if (flowNodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white">
                <div className="text-xl mb-4">🎯 Your Life Graph</div>
                <div className="text-gray-400 text-center max-w-md">
                    Start chatting with your Life Copilot to create goals and projects.
                    They'll appear here as connected nodes showing your life's direction.
                </div>
            </div>
        );
    }

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-900"
            colorMode="dark"
        >
            <Background color="#374151" />
            <Controls />
            <MiniMap
                nodeColor="#6366f1"
                className="!bg-gray-800 !border-gray-600"
            />
            <Panel position="top-left">
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-600">
                    <div className="text-white text-sm font-semibold mb-1">Your Life Graph</div>
                    <div className="text-gray-300 text-xs">
                        {visualizationData.goals.length} goals • {visualizationData.projects.length} projects
                        {visualizationData.tempEntities.length > 0 && ` • ${visualizationData.tempEntities.length} considering`}
                    </div>
                </div>
            </Panel>
        </ReactFlow>
    );
}

export function LifeGraph(props: LifeGraphProps) {
    return (
        <ReactFlowProvider>
            <LifeGraphFlow {...props} />
        </ReactFlowProvider>
    );
} 