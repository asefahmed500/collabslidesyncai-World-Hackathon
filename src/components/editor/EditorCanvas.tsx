
"use client";

import type { Slide, SlideElement, SlideElementStyle, ActiveCollaboratorInfo, User } from '@/types';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Lock, BarChart3 as BarChartIcon, Smile } from 'lucide-react';

interface EditorCanvasProps {
  slide: Slide | null;
  onElementSelect: (elementId: string | null) => void;
  onCanvasClickToAddElement: (position: { x: number, y: number }) => void;
  selectedElementId: string | null;
  onUpdateElement: (updatedElementPartial: Partial<SlideElement>) => void;
  disabled?: boolean;
  activeCollaborators: { [userId: string]: ActiveCollaboratorInfo };
  currentUser: User | null;
  onMouseMove: (position: { x: number; y: number } | null) => void;
  canvasBaseWidth: number;
  canvasBaseHeight: number;
  selectedTool: string | null;
}

const renderElement = (
  element: SlideElement,
  isSelected: boolean,
  onSelect: (e: React.MouseEvent) => void,
  onUpdateElement: (updatedElementPartial: Partial<SlideElement>) => void,
  canvasRef: React.RefObject<HTMLDivElement>,
  disabled?: boolean,
  currentUserId?: string | null,
  activeCollaborators?: { [userId: string]: ActiveCollaboratorInfo }
) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const isLockedByOther = element.lockedBy && element.lockedBy !== currentUserId;
  const lockerName = isLockedByOther && activeCollaborators && activeCollaborators[element.lockedBy!]?.name 
                     ? activeCollaborators[element.lockedBy!]?.name 
                     : "another user";

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || !isSelected || !elementRef.current || isLockedByOther) return;
    e.stopPropagation(); // Prevent canvas click from deselecting
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, initialX: element.position.x, initialY: element.position.y });
    document.body.style.cursor = 'grabbing';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !isSelected || !elementRef.current || !canvasRef.current || isLockedByOther) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      const newX = dragStart.initialX + dx;
      const newY = dragStart.initialY + dy;
      
      elementRef.current.style.left = `${newX}px`;
      elementRef.current.style.top = `${newY}px`;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging && elementRef.current && !isLockedByOther) {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        
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
  }, [isDragging, dragStart, element, isSelected, onUpdateElement, canvasRef, elementRef, isLockedByOther]);


  const style = element.style || {};
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${element.position.x}px`,
    top: `${element.position.y}px`,
    width: `${element.size.width}px`,
    height: `${element.size.height}px`,
    fontFamily: style.fontFamily || 'PT Sans',
    fontSize: style.fontSize || '16px',
    color: style.color || '#000000',
    backgroundColor: style.backgroundColor || 'transparent',
    borderWidth: style.borderWidth ? `${style.borderWidth}px` : (isSelected ? '2px' : '1px'),
    borderStyle: isSelected ? 'dashed' : (style.borderWidth && style.borderWidth > 0 ? 'solid' : 'solid'),
    borderColor: isSelected ? (isLockedByOther ? 'hsl(var(--destructive))' : 'hsl(var(--primary))') : (style.borderColor || (style.borderWidth && style.borderWidth > 0 ? 'hsl(var(--muted-foreground))' : 'transparent')),
    borderRadius: style.borderRadius ? `${style.borderRadius}px` : '0px',
    boxSizing: 'border-box',
    cursor: disabled || isLockedByOther ? 'not-allowed' : (isSelected ? (isDragging ? 'grabbing' : 'grab') : 'pointer'),
    overflow: 'hidden',
    zIndex: element.zIndex || 0,
    userSelect: isDragging ? 'none': 'auto',
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    opacity: style.opacity === undefined ? 1 : style.opacity,
    textAlign: style.textAlign || 'left',
    fontWeight: style.fontWeight || 'normal',
    fontStyle: style.fontStyle || 'normal',
    textDecoration: style.textDecoration || 'none',
  };

  const selectAndPrepareDrag = (e: React.MouseEvent) => {
    if (disabled || isLockedByOther) return;
    onSelect(e); 
    if (isSelected) { 
        handleMouseDown(e);
    }
  };

  const commonProps = {
    key: element.id,
    ref: elementRef,
    style: baseStyle,
    onClick: selectAndPrepareDrag,
    onMouseDown: (isSelected && !disabled && !isLockedByOther) ? handleMouseDown : undefined,
  };

  const lockIcon = isLockedByOther && (
    <div 
        title={`Locked by ${lockerName}`}
        className="absolute -top-2.5 -right-2.5 bg-destructive text-destructive-foreground p-0.5 rounded-full z-50 shadow"
    >
      <Lock size={10} />
    </div>
  );


  switch (element.type) {
    case 'text':
      return (
        <div {...commonProps} className="flex items-center justify-center p-1 whitespace-pre-wrap break-words">
          {element.content || "Text"}
          {lockIcon}
        </div>
      );
    case 'image':
      return (
        <div {...commonProps}>
          <Image
            src={element.content || "https://placehold.co/200x150.png?text=Image"}
            alt={typeof element.content === 'string' && element.content.startsWith('http') ? 'Slide image' : 'Placeholder'}
            layout="fill"
            objectFit="cover"
            data-ai-hint="slide image"
            draggable="false"
          />
          {lockIcon}
        </div>
      );
    case 'shape':
      const shapeStyle: React.CSSProperties = {
        ...baseStyle,
        backgroundColor: style.backgroundColor || 'hsl(var(--muted))',
      };
      if (style.shapeType === 'circle') {
        shapeStyle.borderRadius = '50%';
      }
      // Triangle would require more complex CSS or SVG
      return (
        <div {...commonProps} style={shapeStyle}>
         {/* For triangle, one might use borders or ::after pseudo-elements, or SVG content */}
         {style.shapeType === 'triangle' && <div className="w-full h-full text-xs flex items-center justify-center text-muted-foreground">[Triangle]</div>}
         {lockIcon}
        </div>
      );
    case 'chart': 
      return (
         <div
          {...commonProps}
          className="flex flex-col items-center justify-center border border-dashed border-muted-foreground/50 p-2 bg-muted/20"
        >
          <BarChartIcon className="h-1/2 w-1/2 text-muted-foreground opacity-50"/>
          <p className="text-muted-foreground text-xs mt-1">Chart Placeholder</p>
          {lockIcon}
        </div>
      );
     case 'icon': 
      return (
         <div
          {...commonProps}
          className="flex flex-col items-center justify-center border border-dashed border-muted-foreground/50 p-2 bg-muted/20"
        >
          <Smile className="h-1/2 w-1/2 text-muted-foreground opacity-50"/>
          <p className="text-muted-foreground text-xs mt-1">Icon Placeholder</p>
          {lockIcon}
        </div>
      );
    default:
      return null;
  }
};


export function EditorCanvas({ 
    slide, 
    onElementSelect, 
    onCanvasClickToAddElement,
    selectedElementId, 
    onUpdateElement, 
    disabled,
    activeCollaborators,
    currentUser,
    onMouseMove,
    canvasBaseWidth,
    canvasBaseHeight,
    selectedTool,
}: EditorCanvasProps) {
  const [zoom] = useState(1); 
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || disabled) {
      onMouseMove(null);
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    onMouseMove({ x: x / zoom, y: y / zoom }); 
  };

  const handleCanvasMouseLeave = () => {
    onMouseMove(null); 
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    // If the click target is an element itself, the element's onClick will handle selection.
    // This check ensures that clicking on empty canvas space triggers deselection or element addition.
    if (e.target === canvasRef.current) {
      if (selectedTool) {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        onCanvasClickToAddElement({ x: x / zoom, y: y / zoom });
      } else {
        onElementSelect(null); // Deselect if no tool is active
      }
    }
  };


  if (!slide) {
    return (
      <div className="flex-grow bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Select a slide to view or create a new one.</p>
      </div>
    );
  }

  return (
    <div 
        className="flex-grow flex items-center justify-center p-4 bg-gray-200 dark:bg-gray-800 overflow-auto"
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        style={{ cursor: selectedTool ? 'crosshair' : 'default' }}
    >
      <div
        ref={canvasRef}
        className="relative bg-white shadow-2xl overflow-hidden"
        style={{
          width: `${canvasBaseWidth * zoom}px`,
          height: `${canvasBaseHeight * zoom}px`,
          backgroundColor: slide.backgroundColor || '#FFFFFF',
        }}
        onClick={handleCanvasClick} 
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
            disabled,
            currentUser?.id,
            activeCollaborators
          )
        )}
        {Object.values(activeCollaborators)
            .filter(c => c.id !== currentUser?.id && c.cursorPosition && c.cursorPosition.slideId === slide.id)
            .map(collaborator => (
            <div
                key={collaborator.id}
                title={collaborator.name}
                style={{
                    position: 'absolute',
                    left: `${(collaborator.cursorPosition?.x || 0) * zoom}px`,
                    top: `${(collaborator.cursorPosition?.y || 0) * zoom}px`,
                    transform: 'translate(-2px, -2px)', 
                    zIndex: 10000, 
                    pointerEvents: 'none',
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill={collaborator.color || "rgba(0,0,0,0.7)"} xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.07541 3.25164C5.49575 2.50202 4.41908 2.69172 4.09915 3.58156L1.16853 11.5301C0.871168 12.3588 1.48161 13.2552 2.30509 13.2552H9.6806C10.3751 13.2552 10.9231 12.7072 10.9231 12.0127V3.9161C10.9231 3.12044 10.0183 2.65632 9.37004 3.10912L6.07541 3.25164Z"/>
                </svg>
                <span style={{ backgroundColor: collaborator.color || "rgba(0,0,0,0.7)", color: 'white', padding: '1px 3px', fontSize: '10px', borderRadius: '3px', whiteSpace: 'nowrap', position: 'absolute', top: '18px', left: '0px' }}>
                    {collaborator.name.split(' ')[0]}
                </span>
            </div>
        ))}
      </div>
    </div>
  );
}
