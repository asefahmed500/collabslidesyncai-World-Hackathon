
"use client";

import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Slide } from '@/types';
import { PlusCircle, GripVertical, Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SlideThumbnailListProps {
  slides: Slide[];
  currentSlideId: string | null;
  onSlideSelect: (slideId: string) => void;
  onAddSlide: () => void;
  onDeleteSlide: (slideId: string) => void;
  onDuplicateSlide: (slideId: string) => void;
  onMoveSlide: (slideId: string, direction: 'up' | 'down') => void;
  disabled?: boolean;
}

export function SlideThumbnailList({ 
  slides, 
  currentSlideId, 
  onSlideSelect, 
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onMoveSlide,
  disabled 
}: SlideThumbnailListProps) {
  return (
    <div className="bg-card border-r w-60 flex flex-col h-full shadow-md">
      <ScrollArea className="flex-grow p-3">
        <div className="space-y-3">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              onClick={(e) => {
                 if ((e.target as HTMLElement).closest('button')) return;
                 if (!disabled) onSlideSelect(slide.id)
              }}
              className={cn(
                "group relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 ease-in-out",
                currentSlideId === slide.id ? "border-primary shadow-lg" : "border-border hover:border-primary/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                disabled && "cursor-not-allowed opacity-70"
              )}
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => !disabled && e.key === 'Enter' && onSlideSelect(slide.id)}
              role="button"
              aria-label={`Select slide ${slide.slideNumber || index + 1}`}
              aria-current={currentSlideId === slide.id ? "true" : "false"}
              aria-disabled={disabled}
            >
              <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full z-10">
                {slide.slideNumber || index + 1}
              </div>
              <div 
                className="aspect-[16/9] bg-muted relative"
                style={{ 
                  backgroundColor: slide.backgroundColor || '#FFFFFF',
                  backgroundImage: slide.backgroundImageUrl ? `url(${slide.backgroundImageUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!slide.backgroundImageUrl && ( // Only show placeholder image if no background image
                  <Image
                    src={slide.thumbnailUrl || "https://placehold.co/160x90.png?text=No+Preview"}
                    alt={`Slide ${slide.slideNumber || index + 1}`}
                    layout="fill"
                    objectFit="cover"
                    className="transition-transform group-hover:scale-105"
                    data-ai-hint="slide thumbnail"
                  />
                )}
                 {currentSlideId === slide.id && (
                  <div className="absolute inset-0 bg-primary/20" />
                )}
              </div>
              {/* Action buttons */}
              <div className="absolute bottom-1 right-1 z-20 flex space-x-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
                <TooltipProvider delayDuration={100}>
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0.5 bg-background/70 hover:bg-background" 
                        onClick={(e) => { e.stopPropagation(); if (!disabled && index > 0) onMoveSlide(slide.id, 'up');}} 
                        disabled={disabled || index === 0}
                        aria-label="Move slide up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>Move Up</p></TooltipContent>
                  </Tooltip>
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0.5 bg-background/70 hover:bg-background" 
                        onClick={(e) => { e.stopPropagation(); if (!disabled && index < slides.length - 1) onMoveSlide(slide.id, 'down');}} 
                        disabled={disabled || index === slides.length - 1}
                        aria-label="Move slide down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>Move Down</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0.5 bg-background/70 hover:bg-background" 
                        onClick={(e) => { e.stopPropagation(); if (!disabled) onDuplicateSlide(slide.id);}} 
                        disabled={disabled}
                        aria-label="Duplicate slide"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>Duplicate Slide</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0.5 bg-background/70 hover:bg-background text-destructive hover:text-destructive/80" 
                        onClick={(e) => { e.stopPropagation(); if (!disabled) onDeleteSlide(slide.id);}} 
                        disabled={disabled}
                        aria-label="Delete slide"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>Delete Slide</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 border-t">
        <Button onClick={onAddSlide} className="w-full" variant="outline" disabled={disabled}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Slide
        </Button>
      </div>
    </div>
  );
}

