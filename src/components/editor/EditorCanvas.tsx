"use client";

import type { Slide, SlideElement } from '@/types';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface EditorCanvasProps {
  slide: Slide | null;
  onElementSelect: (elementId: string | null) => void;
  selectedElementId: string | null;
}

const renderElement = (element: SlideElement, isSelected: boolean, onSelect: () => void) => {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${element.position.x}px`,
    top: `${element.position.y}px`,
    width: `${element.size.width}px`,
    height: `${element.size.height}px`,
    fontFamily: element.style.fontFamily,
    fontSize: element.style.fontSize,
    color: element.style.color,
    backgroundColor: element.style.backgroundColor,
    border: isSelected ? '2px dashed hsl(var(--primary))' : `1px solid ${element.style.borderColor || 'transparent'}`,
    boxSizing: 'border-box',
    cursor: 'pointer',
    overflow: 'hidden', // to contain content within bounds
    zIndex: element.zIndex,
  };

  switch (element.type) {
    case 'text':
      return (
        <div
          key={element.id}
          style={baseStyle}
          onClick={onSelect}
          className="flex items-center justify-center p-2" // Basic text alignment
        >
          {element.content}
        </div>
      );
    case 'image':
      return (
        <div key={element.id} style={baseStyle} onClick={onSelect}>
          <Image
            src={element.content}
            alt="Slide image"
            layout="fill"
            objectFit="cover" // or "contain" depending on desired behavior
            data-ai-hint="slide image"
          />
        </div>
      );
    case 'shape':
      // Basic shape rendering, assuming content might specify shape type (e.g., 'rectangle', 'circle')
      // For simplicity, just rendering a colored box
      return (
        <div
          key={element.id}
          style={{
            ...baseStyle,
            backgroundColor: element.style.backgroundColor || 'hsl(var(--muted))',
          }}
          onClick={onSelect}
        />
      );
    case 'chart':
      return (
         <div
          key={element.id}
          style={baseStyle}
          onClick={onSelect}
          className="flex items-center justify-center border border-dashed border-muted-foreground p-2"
        >
          <p className="text-muted-foreground text-sm">[Chart Placeholder: {element.content?.type || 'Generic Chart'}]</p>
          <Image src="https://placehold.co/200x150.png?text=Chart" alt="chart placeholder" width={200} height={150} data-ai-hint="chart placeholder" />
        </div>
      );
    default:
      return null;
  }
};


export function EditorCanvas({ slide, onElementSelect, selectedElementId }: EditorCanvasProps) {
  const [zoom, setZoom] = useState(1); // For future zoom functionality
  
  // Canvas dimensions (aspect ratio 16:9)
  const canvasBaseWidth = 960; // Base width for 100% zoom
  const canvasBaseHeight = 540; // Base height for 100% zoom

  if (!slide) {
    return (
      <div className="flex-grow bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Select a slide to view or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center p-4 bg-gray-200 dark:bg-gray-800 overflow-auto">
      {/* Canvas Wrapper for centering and scaling */}
      <div
        className="relative bg-white shadow-2xl overflow-hidden"
        style={{
          width: `${canvasBaseWidth * zoom}px`,
          height: `${canvasBaseHeight * zoom}px`,
          backgroundColor: slide.backgroundColor || '#FFFFFF',
          // transform: `scale(${zoom})`, // Apply zoom here or on child elements depending on strategy
        }}
        onClick={() => onElementSelect(null)} // Deselect elements when clicking canvas background
      >
        {slide.elements.map(element =>
          renderElement(
            element,
            selectedElementId === element.id,
            (e?: React.MouseEvent) => {
              if (e) e.stopPropagation(); // Prevent click from bubbling to canvas wrapper
              onElementSelect(element.id);
            }
          )
        )}
      </div>
    </div>
  );
}
