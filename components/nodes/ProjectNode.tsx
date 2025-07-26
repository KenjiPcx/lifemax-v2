"use client"

import React from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Package } from 'lucide-react';

export type ProjectNode = Node<
    {
        name: string;
        description: string;
        status?: string;
        completed?: boolean;
    },
    "project"
>;

export default function ProjectNode({ data }: NodeProps<ProjectNode>) {
    const isCompleted = data.completed;

    return (
        <div className={`${isCompleted
            ? 'bg-blue-800 border-blue-600'
            : 'bg-blue-600 border-blue-400'
            } border-2 rounded-lg p-4 min-w-[200px] max-w-[250px] shadow-lg`}>
            <Handle
                type="target"
                position={Position.Top}
                className={`w-3 h-3 ${isCompleted ? 'bg-blue-600' : 'bg-blue-400'
                    } border-2 border-blue-600`}
            />

            <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-white" />
                <span className="text-white font-semibold text-sm">Project</span>
            </div>

            <h3 className="text-white font-bold text-sm mb-2 leading-tight">
                {data.name}
            </h3>

            <p className={`${isCompleted ? 'text-blue-200' : 'text-blue-100'
                } text-xs leading-relaxed`}>
                {data.description.length > 100
                    ? `${data.description.substring(0, 100)}...`
                    : data.description
                }
            </p>

            <div className="mt-2 flex items-center gap-2">
                {data.status && (
                    <span className={`text-xs px-2 py-1 rounded-full ${data.status === 'completed'
                        ? 'bg-blue-800 text-blue-200'
                        : data.status === 'in-progress'
                            ? 'bg-blue-700 text-blue-100'
                            : 'bg-gray-600 text-gray-200'
                        }`}>
                        {data.status}
                    </span>
                )}

                {isCompleted && (
                    <span className="text-xs px-2 py-1 bg-green-700 text-green-100 rounded-full">
                        ✓ Done
                    </span>
                )}
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className={`w-3 h-3 ${isCompleted ? 'bg-blue-600' : 'bg-blue-400'
                    } border-2 border-blue-600`}
            />
        </div>
    );
} 