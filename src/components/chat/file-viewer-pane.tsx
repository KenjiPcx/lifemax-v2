'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon, AlertTriangleIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileViewerPaneProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  title?: string;
}

export function FileViewerPane({
  isOpen,
  onClose,
  fileUrl,
  title,
}: FileViewerPaneProps) {
  const [isLoadingIframe, setIsLoadingIframe] = useState(true);
  const [iframeError, setIframeError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Reloading file viewer');
    if (fileUrl) {
      setIsLoadingIframe(true);
      setIframeError(null);
    }
  }, [fileUrl]);

  const effectiveTitle =
    title || (fileUrl ? 'File Viewer' : 'No file selected');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-testid="file-viewer-pane"
          className={cn(
            'h-full bg-background shadow-xl flex flex-col w-full border-r',
          )}
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '0%', opacity: 1 }}
          exit={{ x: '-100%', opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h2
              className="text-lg font-semibold truncate"
              title={effectiveTitle}
            >
              {effectiveTitle}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XIcon className="h-5 w-5" />
              <span className="sr-only">Close File Viewer</span>
            </Button>
          </div>

          <div className="flex-grow p-4 overflow-y-auto relative">
            {fileUrl ? (
              <>
                {isLoadingIframe && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50">
                    <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">
                      Loading file...
                    </p>
                  </div>
                )}
                {iframeError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500">
                    <AlertTriangleIcon className="h-8 w-8 mb-2" />
                    <p className="font-semibold">Error loading file</p>
                    <p className="text-sm">{iframeError}</p>
                    <p className="text-xs mt-1">
                      The file type might not be viewable or an error occurred.
                    </p>
                  </div>
                )}
                <iframe
                  key={fileUrl}
                  src={fileUrl}
                  title={effectiveTitle}
                  className={cn(
                    'w-full h-full border-0',
                    (isLoadingIframe || iframeError) && 'opacity-0',
                  )}
                  onLoad={() => {
                    setIsLoadingIframe(false);
                    setIframeError(null);
                  }}
                  onError={(e) => {
                    console.error('Iframe load error:', e);
                    setIsLoadingIframe(false);
                    setIframeError('Could not load the file content.');
                  }}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <AlertTriangleIcon className="h-10 w-10 mb-3" />
                <p className="text-lg font-semibold">No file selected</p>
                <p className="text-sm">
                  Click on a source to view its content here.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
