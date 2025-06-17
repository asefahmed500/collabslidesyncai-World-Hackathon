
"use client";

import type { Slide, SlideElement } from '@/types';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

interface EditorCanvasProps {
  slide: Slide | null;
  onElementSelect: (elementId: string | null) => void;
  selectedElementId: string | null;
  onUpdateElement: (updatedElement: Partial<SlideElement>) => void; // Added for drag/resize
}

const renderElement = (
  element: SlideElement,
  isSelected: boolean,
  onSelect: (e: React.MouseEvent) => void,
  onUpdateElement: (updatedElement: Partial<SlideElement>) => void,
  canvasRef: React.RefObject<HTMLDivElement>
) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelected) return; // Only drag selected elements
    e.stopPropagation(); // Prevent canvas deselection
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !isSelected || !elementRef.current || !canvasRef.current) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      // Calculate new position relative to canvas, considering canvas scale if any (zoom not implemented yet)
      const newX = element.position.x + dx;
      const newY = element.position.y + dy;
      
      // Basic boundary checks (optional, can be improved)
      // const canvasRect = canvasRef.current.getBoundingClientRect();
      // const newBoundedX = Math.max(0, Math.min(newX, canvasRect.width - element.size.width));
      // const newBoundedY = Math.max(0, Math.min(newY, canvasRect.height - element.size.height));


      // Call onUpdateElement immediately for real-time feedback
      // In a real app, you might debounce this or update onMouseUp
      onUpdateElement({ id: element.id, position: { x: newX, y: newY } });
      setDragStart({ x: e.clientX, y: e.clientY }); // Reset drag start for next move delta
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Final update call could be here if not updating on every mouse move
        // This is where you would persist the final position to backend if not done in onUpdateElement
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, element, isSelected, onUpdateElement, canvasRef]);


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
    cursor: isSelected ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
    overflow: 'hidden',
    zIndex: element.zIndex,
    userSelect: 'none', // Prevent text selection while dragging
  };

  const selectAndPrepareDrag = (e: React.MouseEvent) => {
    onSelect(e); // Calls onElementSelect(element.id) via propagation
    if (isSelected) { // If it's already selected, prepare for drag
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
          onMouseDown={isSelected ? handleMouseDown : undefined} // Only allow dragging selected item
          className="flex items-center justify-center p-2"
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
          onMouseDown={isSelected ? handleMouseDown : undefined}
        >
          <Image
            src={element.content}
            alt="Slide image"
            layout="fill"
            objectFit="cover"
            data-ai-hint="slide image"
            draggable="false" // Prevent native image drag
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
            backgroundColor: element.style.backgroundColor || 'hsl(var(--muted))',
          }}
          onClick={selectAndPrepareDrag}
          onMouseDown={isSelected ? handleMouseDown : undefined}
        />
      );
    case 'chart':
      return (
         <div
          ref={elementRef}
          key={element.id}
          style={baseStyle}
          onClick={selectAndPrepareDrag}
          onMouseDown={isSelected ? handleMouseDown : undefined}
          className="flex flex-col items-center justify-center border border-dashed border-muted-foreground p-2"
        >
          <p className="text-muted-foreground text-sm">[Chart: {element.content?.type || 'Generic'}]</p>
          <Image src="https://placehold.co/200x150.png?text=Chart" alt="chart placeholder" width={Math.min(200, element.size.width - 20)} height={Math.min(150, element.size.height - 40)} data-ai-hint="chart placeholder" draggable="false"/>
        </div>
      );
    default:
      return null;
  }
};


export function EditorCanvas({ slide, onElementSelect, selectedElementId, onUpdateElement }: EditorCanvasProps) {
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
        onClick={() => onElementSelect(null)} 
      >
        {(slide.elements || []).map(element =>
          renderElement(
            element,
            selectedElementId === element.id,
            (e: React.MouseEvent) => {
              e.stopPropagation(); 
              onElementSelect(element.id);
            },
            onUpdateElement,
            canvasRef
          )
        )}
      </div>
    </div>
  );
}
