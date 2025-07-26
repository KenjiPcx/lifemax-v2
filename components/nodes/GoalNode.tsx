"use client"

import React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Target } from 'lucide-react';

export type GoalNode = Node<{
    name: string;
    description: string;
    status?: string;
}, "goal">;

export default function GoalNode({ data }: NodeProps<GoalNode>) {
    return (
        <div className="bg-green-600 border-2 border-green-400 rounded-lg p-4 min-w-[200px] max-w-[250px] shadow-lg">
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 bg-green-400 border-2 border-green-600"
            />

            <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-white" />
                <span className="text-white font-semibold text-sm">Goal</span>
            </div>

            <h3 className="text-white font-bold text-sm mb-2 leading-tight">
                {data.name}
            </h3>

            <p className="text-green-100 text-xs leading-relaxed">
                {data.description.length > 100
                    ? `${data.description.substring(0, 100)}...`
                    : data.description
                }
            </p>

            {data.status && (
                <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${data.status === 'completed'
                        ? 'bg-green-800 text-green-200'
                        : data.status === 'active'
                            ? 'bg-green-700 text-green-100'
                            : 'bg-gray-600 text-gray-200'
                        }`}>
                        {data.status}
                    </span>
                </div>
            )}

            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 bg-green-400 border-2 border-green-600"
            />
        </div>
    );
} 