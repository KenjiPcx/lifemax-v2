// import {
//     forceSimulation,
//     forceLink,
//     forceManyBody,
//     forceX,
//     forceY,
// } from 'd3-force';
// import React, { useCallback, useMemo, useRef, useEffect } from 'react';
// import {
//     ReactFlow,
//     ReactFlowProvider,
//     Panel,
//     useNodesState,
//     useEdgesState,
//     useReactFlow,
//     useNodesInitialized,
//     Node,
//     Edge,
//     NodeProps,
//     Handle,
//     Position,
// } from '@xyflow/react';
// import '@xyflow/react/dist/style.css';
// import { collide } from './collide';
// // import { useQuery } from 'convex/react';
// // import { api } from '../../convex/_generated/api';
// // import { Id } from '../../convex/_generated/dataModel';
// import { cn } from '../../lib/utils';

// // Custom node types for different life events
// interface LifeNodeData {
//     id: string;
//     position: { x: number; y: number };
//     data: {
//         label: string;
//         outcome: string;
//         commentary: string;
//         score: number;
//         roi: number;
//         importance: number;
//         realized: boolean;
//         active: boolean;
//         tags: string[];
//         simColor: string;
//         isHighlighted?: boolean;
//         isSelected?: boolean;
//     }
// }

// const LifeNode: React.FC<NodeProps<LifeNodeData>> = ({ data, selected }) => {
//     const getNodeStyle = () => {
//         let baseStyle = "min-w-32 p-3 rounded-lg border-2 bg-gray-800 shadow-lg transition-all duration-500 cursor-pointer text-white transform hover:scale-105";

//         // Handle selection first
//         if (data.isSelected || selected) {
//             baseStyle += " ring-2 ring-offset-2 ring-emerald-400 border-emerald-500 animate-pulse";
//         }
//         // Handle highlighting
//         else if (data.isHighlighted) {
//             baseStyle += " ring-2 ring-offset-1 ring-yellow-300 border-yellow-400 bg-yellow-900 animate-bounce";
//         }
//         // Normal state styling
//         else if (data.realized) {
//             baseStyle += " border-emerald-500 bg-emerald-900";
//         } else if (data.active) {
//             baseStyle += " border-blue-500 bg-blue-900";
//         } else {
//             baseStyle += " border-gray-600 bg-gray-800";
//         }

//         // Highlight high ROI nodes (unless already highlighted/selected)
//         if (data.roi > 0.7 && !data.isHighlighted && !data.isSelected && !selected) {
//             baseStyle += " border-yellow-400 bg-yellow-900 shadow-yellow-400/20 shadow-lg";
//         }

//         // Add simulation color accent with glow effect
//         if (data.simColor && data.simColor !== '#gray') {
//             baseStyle += " border-l-4 shadow-lg";
//         }

//         // Add entrance animation for new nodes
//         if (!data.realized) {
//             baseStyle += " animate-fadeInUp";
//         }

//         return baseStyle;
//     };

//     const getScoreColor = (score: number) => {
//         if (score >= 0.8) return "text-emerald-400";
//         if (score >= 0.6) return "text-yellow-400";
//         if (score >= 0.4) return "text-orange-400";
//         return "text-red-400";
//     };

//     return (
//         <div className={getNodeStyle()}>
//             <Handle type="target" position={Position.Top} />

//             <div className="space-y-2">
//                 <div className="font-semibold text-sm text-white">
//                     {data.label}
//                 </div>

//                 <div className="text-xs text-gray-300 leading-tight">
//                     {data.outcome}
//                 </div>

//                 <div className="flex items-center justify-between text-xs">
//                     <span className={cn("font-semibold", getScoreColor(data.score))}>
//                         Score: {(data.score * 100).toFixed(0)}%
//                     </span>
//                     <span className="text-gray-400">
//                         ROI: {(data.roi * 100).toFixed(0)}%
//                     </span>
//                 </div>

//                 {data.tags.length > 0 && (
//                     <div className="flex flex-wrap gap-1">
//                         {data.tags.slice(0, 2).map((tag, i) => (
//                             <span key={i} className="text-xs px-1 py-0.5 bg-gray-700 text-gray-300 rounded">
//                                 {tag}
//                             </span>
//                         ))}
//                     </div>
//                 )}
//             </div>

//             <Handle type="source" position={Position.Bottom} />
//         </div>
//     );
// };

// const nodeTypes = {
//     lifeNode: LifeNode,
// };

// const simulation = forceSimulation()
//     .force('charge', forceManyBody().strength(-1000))
//     .force('x', forceX().x(0).strength(0.05))
//     .force('y', forceY().y(0).strength(0.05))
//     .force('collide', collide())
//     .alphaTarget(0.05)
//     .stop();

// const useLayoutedElements = () => {
//     const { getNodes, setNodes, getEdges, fitView } = useReactFlow();
//     const initialized = useNodesInitialized();

//     // You can use these events if you want the flow to remain interactive while
//     // the simulation is running. The simulation is typically responsible for setting
//     // the position of nodes, but if we have a reference to the node being dragged,
//     // we use that position instead.
//     const draggingNodeRef = useRef<NodeProps<LifeNodeData> | null>(null);
//     const dragEvents = useMemo(
//         () => ({
//             start: (_event: React.MouseEvent, node: NodeProps<LifeNodeData>) => (draggingNodeRef.current = node),
//             drag: (_event: React.MouseEvent, node: NodeProps<LifeNodeData>) => (draggingNodeRef.current = node),
//             stop: () => (draggingNodeRef.current = null),
//         }),
//         [],
//     );

//     return useMemo(() => {
//         let nodes = getNodes().map((node) => ({
//             ...node,
//             x: node.position.x,
//             y: node.position.y,
//         }));
//         let edges = getEdges().map((edge) => edge);
//         let running = false;

//         // If React Flow hasn't initialized our nodes with a width and height yet, or
//         // if there are no nodes in the flow, then we can't run the simulation!
//         if (!initialized || nodes.length === 0) return [false, {}, dragEvents];

//         simulation.nodes(nodes).force(
//             'link',
//             forceLink(edges)
//                 .id((d: any) => d.id)
//                 .strength(0.05)
//                 .distance(100),
//         );

//         // The tick function is called every animation frame while the simulation is
//         // running and progresses the simulation one step forward each time.
//         const tick = () => {
//             getNodes().forEach((node, i) => {
//                 const dragging = draggingNodeRef.current?.id === node.id;

//                 // Setting the fx/fy properties of a node tells the simulation to "fix"
//                 // the node at that position and ignore any forces that would normally
//                 // cause it to move.
//                 if (dragging) {
//                     nodes[i].fx = draggingNodeRef.current?.position.x;
//                     nodes[i].fy = draggingNodeRef.current?.position.y;
//                 } else {
//                     delete nodes[i].fx;
//                     delete nodes[i].fy;
//                 }
//             });

//             simulation.tick();
//             setNodes(
//                 nodes.map((node) => ({
//                     ...node,
//                     position: { x: node.fx ?? node.x, y: node.fy ?? node.y },
//                 })),
//             );

//             window.requestAnimationFrame(() => {
//                 // Give React and React Flow a chance to update and render the new node
//                 // positions before we fit the viewport to the new layout.
//                 fitView();

//                 // If the simulation hasn't been stopped, schedule another tick.
//                 if (running) tick();
//             });
//         };

//         const toggle = () => {
//             if (!running) {
//                 getNodes().forEach((node, index) => {
//                     let simNode = nodes[index];
//                     Object.assign(simNode, node);
//                     simNode.x = node.position.x;
//                     simNode.y = node.position.y;
//                 });
//             }
//             running = !running;
//             running && window.requestAnimationFrame(tick);
//         };

//         const isRunning = () => running;

//         return [true, { toggle, isRunning }, dragEvents];
//     }, [initialized, dragEvents, getNodes, getEdges, setNodes, fitView]);
// };

// interface LifeGraphProps {
//     userId: string;
//     threadId?: string;
//     highlightedNodes?: Set<string>;
//     selectedNode?: string | null;
//     onNodeSelect?: (nodeId: string) => void;
//     onClearSelection?: () => void;
// }

// const LifeGraphFlow: React.FC<LifeGraphProps> = ({
//     userId,
//     threadId,
//     highlightedNodes = new Set(),
//     selectedNode = null,
//     onNodeSelect,
//     onClearSelection
// }) => {
//     // const lifeGraphData = useQuery(api.lifeGraph.getLifeGraph, { userId, threadId });
//     const lifeGraphData = mockLifeGraphData; // Use mock data for now
//     const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
//     const [edges, setEdges, onEdgesChange] = useEdgesState([]);
//     const [initialized, { toggle, isRunning }, dragEvents] = useLayoutedElements();

//     // Convert Convex data to ReactFlow format
//     useEffect(() => {
//         if (!lifeGraphData) return;

//         const { nodes: dbNodes, edges: dbEdges, simulations } = lifeGraphData;

//         // Create a color map for simulations
//         const simColorMap = new Map<string, string>();
//         simulations.forEach((sim) => {
//             simColorMap.set(sim.id, sim.color);
//         });

//         // Convert nodes
//         const reactFlowNodes: Node<LifeNodeData>[] = dbNodes.map((node) => {
//             const isHighlighted = highlightedNodes.has(node.id);
//             const isSelected = selectedNode === node.id;

//             return {
//                 id: node.id,
//                 type: 'lifeNode',
//                 position: node.position || { x: Math.random() * 500, y: Math.random() * 500 },
//                 selected: isSelected,
//                 data: {
//                     label: node.label,
//                     outcome: node.outcome,
//                     commentary: node.commentary,
//                     score: node.score,
//                     roi: node.roi,
//                     importance: node.importance,
//                     realized: node.realized,
//                     active: node.active,
//                     tags: node.tags,
//                     simColor: simColorMap.get(node.simId) || '#gray',
//                     isHighlighted,
//                     isSelected,
//                 },
//             };
//         });

//         // Convert edges
//         const reactFlowEdges: Edge[] = dbEdges.map((edge) => ({
//             id: edge.id,
//             source: edge.from,
//             target: edge.to,
//             label: edge.label,
//             animated: !dbNodes.find(n => n.id === edge.to)?.realized,
//             style: {
//                 stroke: simColorMap.get(edge.simId) || '#gray',
//                 strokeWidth: 2,
//             },
//             labelStyle: {
//                 fontSize: 10,
//                 fill: '#666',
//             },
//         }));

//         setNodes(reactFlowNodes);
//         setEdges(reactFlowEdges);
//     }, [lifeGraphData, highlightedNodes, selectedNode, setNodes, setEdges]);

//     if (!lifeGraphData) {
//         return (
//             <div className="flex items-center justify-center h-full bg-gray-800">
//                 <div className="text-gray-400">Loading your life graph...</div>
//             </div>
//         );
//     }

//     const handleNodeClick = (event: React.MouseEvent, node: Node) => {
//         event.stopPropagation();
//         if (onNodeSelect) {
//             onNodeSelect(node.id);
//         }
//     };

//     const handlePaneClick = () => {
//         if (onClearSelection) {
//             onClearSelection();
//         }
//     };

//     return (
//         <ReactFlow
//             nodes={nodes}
//             edges={edges}
//             nodeTypes={nodeTypes}
//             onNodeClick={handleNodeClick}
//             onPaneClick={handlePaneClick}
//             onNodeDragStart={dragEvents.start}
//             onNodeDrag={dragEvents.drag}
//             onNodeDragStop={dragEvents.stop}
//             onNodesChange={onNodesChange}
//             onEdgesChange={onEdgesChange}
//             fitView
//             minZoom={0.2}
//             maxZoom={1.5}
//         >
//             <Panel position="top-left">
//                 {initialized && (
//                     <div className="flex flex-col gap-2 p-2 bg-gray-900 rounded-lg shadow-sm border border-gray-700">
//                         <button
//                             onClick={toggle}
//                             className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
//                         >
//                             {isRunning() ? 'Stop' : 'Start'} force simulation
//                         </button>
//                         <div className="text-xs text-gray-400">
//                             {lifeGraphData.nodes.length} nodes, {lifeGraphData.edges.length} connections
//                         </div>
//                     </div>
//                 )}
//             </Panel>

//             <Panel position="top-right">
//                 <div className="p-2 bg-gray-900 rounded-lg shadow-sm max-w-64 border border-gray-700">
//                     <h3 className="text-sm font-semibold mb-2 text-white">Simulations</h3>
//                     <div className="space-y-1">
//                         {lifeGraphData.simulations.map((sim) => (
//                             <div key={sim.id} className={`flex items-center gap-2 text-xs p-1 rounded ${sim.status === 'running' ? 'simulation-running' : ''
//                                 }`}>
//                                 <div
//                                     className={`w-3 h-3 rounded-full transition-all duration-300 ${sim.status === 'running' ? 'animate-pulse-glow' : ''
//                                         }`}
//                                     style={{ backgroundColor: sim.color }}
//                                 />
//                                 <span className="truncate text-gray-300 flex-1">
//                                     {sim.scenario || 'Life History'}
//                                 </span>
//                                 <span className={`px-1 py-0.5 rounded text-xs transition-all duration-300 ${sim.status === 'completed' ? 'bg-emerald-900 text-emerald-300' :
//                                         sim.status === 'running' ? 'bg-blue-900 text-blue-300 animate-pulse' :
//                                             'bg-gray-800 text-gray-400'
//                                     }`}>
//                                     {sim.status === 'running' && (
//                                         <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-ping mr-1"></span>
//                                     )}
//                                     {sim.status}
//                                 </span>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             </Panel>
//         </ReactFlow>
//     );
// };

// export default function LifeGraph({
//     userId,
//     threadId,
//     highlightedNodes,
//     selectedNode,
//     onNodeSelect,
//     onClearSelection
// }: LifeGraphProps) {
//     return (
//         <ReactFlowProvider>
//             <LifeGraphFlow
//                 userId={userId}
//                 threadId={threadId}
//                 highlightedNodes={highlightedNodes}
//                 selectedNode={selectedNode}
//                 onNodeSelect={onNodeSelect}
//                 onClearSelection={onClearSelection}
//             />
//         </ReactFlowProvider>
//     );
// }