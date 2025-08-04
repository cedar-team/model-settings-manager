import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className }) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn("cursor-help", className)}
      >
        {children || <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />}
      </div>
      
      {isVisible && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[9999] pointer-events-none">
          <div className="bg-gray-900 text-white text-sm rounded-lg shadow-xl border border-gray-700 px-4 py-3 whitespace-normal w-80">
            <div className="text-center font-medium">{content}</div>
            {/* Arrow pointing up */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};