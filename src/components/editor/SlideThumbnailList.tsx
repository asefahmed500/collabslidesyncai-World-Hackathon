"use client";

import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Slide } from '@/types';
import { PlusCircle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideThumbnailListProps {
  slides: Slide[];
  currentSlideId: string | null;
  onSlideSelect: (slideId: string) => void;
  onAddSlide: () => void;
}

export function SlideThumbnailList({ slides, currentSlideId, onSlideSelect, onAddSlide }: SlideThumbnailListProps) {
  return (
    <div className="bg-card border-r w-60 flex flex-col h-full shadow-md">
      <ScrollArea className="flex-grow p-3">
        <div className="space-y-3">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              onClick={() => onSlideSelect(slide.id)}
              className={cn(
                "group relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 ease-in-out",
                currentSlideId === slide.id ? "border-primary shadow-lg" : "border-border hover:border-primary/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              )}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSlideSelect(slide.id)}
              role="button"
              aria-label={`Select slide ${slide.slideNumber}`}
              aria-current={currentSlideId === slide.id ? "true" : "false"}
            >
              <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full z-10">
                {slide.slideNumber}
              </div>
              <div className="aspect-[16/9] bg-muted relative">
                <Image
                  src={slide.thumbnailUrl || "https://placehold.co/160x90.png?text=No+Preview"}
                  alt={`Slide ${slide.slideNumber}`}
                  layout="fill"
                  objectFit="cover"
                  className="transition-transform group-hover:scale-105"
                  data-ai-hint="slide thumbnail"
                />
                 {currentSlideId === slide.id && (
                  <div className="absolute inset-0 bg-primary/20" />
                )}
              </div>
              {/* Drag handle (visual only) */}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 border-t">
        <Button onClick={onAddSlide} className="w-full" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Slide
        </Button>
      </div>
    </div>
  );
}
