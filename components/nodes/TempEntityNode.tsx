import React from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { HelpCircle, Target, Package, Calendar } from 'lucide-react';

export type TempEntityNode = Node<{
    name: string;
    description: string;
    type: "goal" | "project" | "event";
    similarityScores?: {
        goals: Array<{ id: string; score: number }>;
        projects: Array<{ id: string; score: number }>;
    };
}, "tempEntity">;

export default function TempEntityNode({ data }: NodeProps<TempEntityNode>) {
    const getIcon = () => {
        switch (data.type) {
            case 'goal':
                return <Target className="w-4 h-4 text-orange-200" />;
            case 'project':
                return <Package className="w-4 h-4 text-orange-200" />;
            case 'event':
                return <Calendar className="w-4 h-4 text-orange-200" />;
            default:
                return <HelpCircle className="w-4 h-4 text-orange-200" />;
        }
    };

    const getTypeColor = () => {
        switch (data.type) {
            case 'goal':
                return 'text-green-300';
            case 'project':
                return 'text-blue-300';
            case 'event':
                return 'text-purple-300';
            default:
                return 'text-gray-300';
        }
    };

    const topSimilarity = data.similarityScores ?
        Math.max(
            ...data.similarityScores.goals.map(g => g.score),
            ...data.similarityScores.projects.map(p => p.score)
        ) : 0;

    return (
        <div className="bg-orange-600 border-2 border-orange-400 border-dashed rounded-lg p-4 min-w-[200px] max-w-[250px] shadow-lg opacity-90">
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 bg-orange-400 border-2 border-orange-600"
            />

            <div className="flex items-center gap-2 mb-2">
                {getIcon()}
                <span className="text-white font-semibold text-sm">
                    Considering {data.type}
                </span>
            </div>

            <h3 className="text-white font-bold text-sm mb-2 leading-tight">
                {data.name}
            </h3>

            <p className="text-orange-100 text-xs leading-relaxed mb-2">
                {data.description.length > 80
                    ? `${data.description.substring(0, 80)}...`
                    : data.description
                }
            </p>

            {topSimilarity > 0 && (
                <div className="mt-2">
                    <div className="text-xs text-orange-200 mb-1">
                        Similarity to existing items:
                    </div>
                    <div className="w-full bg-orange-800 rounded-full h-2">
                        <div
                            className="bg-orange-300 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${topSimilarity * 100}%` }}
                        />
                    </div>
                    <div className="text-xs text-orange-200 mt-1">
                        {Math.round(topSimilarity * 100)}% match
                    </div>
                </div>
            )}

            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 bg-orange-400 border-2 border-orange-600"
            />
        </div>
    );
} 