
"use client";

import type { Slide, SlideElement } from '@/types';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

interface EditorCanvasProps {
  slide: Slide | null;
  onElementSelect: (elementId: string | null) => void;
  selectedElementId: string | null;
  onUpdateElement: (updatedElementPartial: Partial<SlideElement>) => void;
  disabled?: boolean;
}

const renderElement = (
  element: SlideElement,
  isSelected: boolean,
  onSelect: (e: React.MouseEvent) => void,
  onUpdateElement: (updatedElementPartial: Partial<SlideElement>) => void,
  canvasRef: React.RefObject<HTMLDivElement>,
  disabled?: boolean
) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || !isSelected || !elementRef.current) return;
    e.stopPropagation();
    setIsDragging(true);
    // Store initial element position and mouse position
    setDragStart({ x: e.clientX, y: e.clientY, initialX: element.position.x, initialY: element.position.y });
    document.body.style.cursor = 'grabbing';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !isSelected || !elementRef.current || !canvasRef.current) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      const newX = dragStart.initialX + dx;
      const newY = dragStart.initialY + dy;
      
      // Update element style directly for visual feedback during drag
      elementRef.current.style.left = `${newX}px`;
      elementRef.current.style.top = `${newY}px`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging && elementRef.current) {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        
        // Calculate final position based on the total delta from the initial drag point
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const finalX = dragStart.initialX + dx;
        const finalY = dragStart.initialY + dy;

        onUpdateElement({ id: element.id, position: { x: finalX, y: finalY } });
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (document.body.style.cursor === 'grabbing') {
        document.body.style.cursor = 'default';
      }
    };
  }, [isDragging, dragStart, element, isSelected, onUpdateElement, canvasRef, elementRef]);


  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${element.position.x}px`,
    top: `${element.position.y}px`,
    width: `${element.size.width}px`,
    height: `${element.size.height}px`,
    fontFamily: element.style?.fontFamily || 'PT Sans',
    fontSize: element.style?.fontSize || '16px',
    color: element.style?.color || '#000000',
    backgroundColor: element.style?.backgroundColor || 'transparent',
    border: isSelected ? '2px dashed hsl(var(--primary))' : `1px solid ${element.style?.borderColor || 'transparent'}`,
    boxSizing: 'border-box',
    cursor: disabled ? 'default' : (isSelected ? (isDragging ? 'grabbing' : 'grab') : 'pointer'),
    overflow: 'hidden', // Clip content that overflows, common for text boxes
    zIndex: element.zIndex || 0,
    userSelect: isDragging ? 'none': 'auto',
  };

  const selectAndPrepareDrag = (e: React.MouseEvent) => {
    if (disabled) return;
    onSelect(e); 
    if (isSelected) { 
        handleMouseDown(e);
    }
  };


  switch (element.type) {
    case 'text':
      return (
        <div
          ref={elementRef}
          key={element.id}
          style={baseStyle}
          onClick={selectAndPrepareDrag}
          onMouseDown={isSelected && !disabled ? handleMouseDown : undefined}
          className="flex items-center justify-center p-1 whitespace-pre-wrap break-words" // Allow text wrapping
        >
          {element.content}
        </div>
      );
    case 'image':
      return (
        <div 
          ref={elementRef}
          key={element.id} 
          style={baseStyle} 
          onClick={selectAndPrepareDrag}
          onMouseDown={isSelected && !disabled ? handleMouseDown : undefined}
        >
          <Image
            src={element.content || "https://placehold.co/200x150.png?text=Image"}
            alt="Slide image"
            layout="fill"
            objectFit="cover" // or "contain" or other values as needed
            data-ai-hint="slide image"
            draggable="false"
          />
        </div>
      );
    case 'shape':
      return (
        <div
          ref={elementRef}
          key={element.id}
          style={{
            ...baseStyle,
            backgroundColor: element.style?.backgroundColor || 'hsl(var(--muted))',
          }}
          onClick={selectAndPrepareDrag}
          onMouseDown={isSelected && !disabled ? handleMouseDown : undefined}
        />
      );
    case 'chart': // Basic placeholder for chart
      return (
         <div
          ref={elementRef}
          key={element.id}
          style={baseStyle}
          onClick={selectAndPrepareDrag}
          onMouseDown={isSelected && !disabled ? handleMouseDown : undefined}
          className="flex flex-col items-center justify-center border border-dashed border-muted-foreground p-2 bg-gray-50"
        >
          <p className="text-muted-foreground text-sm">[Chart: {typeof element.content === 'object' ? element.content?.type : 'Generic'}]</p>
          <Image src="https://placehold.co/200x100.png?text=Chart+Data" alt="chart placeholder" width={Math.min(200, element.size.width - 20)} height={Math.min(100, element.size.height - 40)} data-ai-hint="chart placeholder" draggable="false"/>
        </div>
      );
    default:
      return null;
  }
};


export function EditorCanvas({ slide, onElementSelect, selectedElementId, onUpdateElement, disabled }: EditorCanvasProps) {
  const [zoom] = useState(1); 
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const canvasBaseWidth = 960; 
  const canvasBaseHeight = 540;

  if (!slide) {
    return (
      <div className="flex-grow bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Select a slide to view or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center p-4 bg-gray-200 dark:bg-gray-800 overflow-auto">
      <div
        ref={canvasRef}
        className="relative bg-white shadow-2xl overflow-hidden"
        style={{
          width: `${canvasBaseWidth * zoom}px`,
          height: `${canvasBaseHeight * zoom}px`,
          backgroundColor: slide.backgroundColor || '#FFFFFF',
        }}
        onClick={!disabled ? () => onElementSelect(null) : undefined} 
      >
        {(slide.elements || []).map(element =>
          renderElement(
            element,
            selectedElementId === element.id,
            (e: React.MouseEvent) => {
              if (disabled) return;
              e.stopPropagation(); 
              onElementSelect(element.id);
            },
            onUpdateElement,
            canvasRef,
            disabled
          )
        )}
      </div>
    </div>
  );
}

