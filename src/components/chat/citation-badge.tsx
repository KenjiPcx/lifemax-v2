'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CitationBadgeProps {
  citationNumber: number;
  className?: string;
  url?: string;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({
  citationNumber,
  className,
  url,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full',
        'bg-gray-600 text-gray-100 dark:bg-gray-700 dark:text-gray-200',
        'ring-1 ring-inset ring-gray-500/50 dark:ring-gray-600/50',
        className,
      )}
      title={`Citation ${citationNumber}`}
    >
      {citationNumber}
    </span>
  );
};
