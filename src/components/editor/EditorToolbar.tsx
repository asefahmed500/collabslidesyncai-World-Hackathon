
"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Type, // Text
  Square, // Shape (generic, can represent rectangle)
  Circle as CircleIcon, // Shape (Circle)
  Image as ImageIcon,
  BarChart2, // Chart
  Palette, // Colors
  CaseSensitive, // Fonts
  Copy, // Duplicate
  Trash2, // Delete
  Undo,
  Redo,
  Play, // Present
  Settings2, // AI settings maybe
  Lightbulb, // AI suggestions
  MessageSquare, // Comments
  LayoutTemplate, // For templates
} from "lucide-react";

const editorTools = [
  { id: "text", label: "Text", icon: Type },
  { id: "shape-square", label: "Rectangle", icon: Square },
  { id: "shape-circle", label: "Circle", icon: CircleIcon },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "chart", label: "Chart", icon: BarChart2 },
];

const actionTools = [
  { id: "undo", label: "Undo", icon: Undo },
  { id: "redo", label: "Redo", icon: Redo },
  // Duplicate and Delete slide actions are now on thumbnails
  // { id: "duplicate", label: "Duplicate Slide", icon: Copy }, 
  // { id: "delete", label: "Delete Slide", icon: Trash2 },
];

const aiTools = [
  { id: "ai-design", label: "AI Design Assist", icon: Palette },
  { id: "ai-content", label: "AI Content Writer", icon: Lightbulb },
];


interface EditorToolbarProps {
  onToolSelect: (tool: string) => void;
  onAction: (action: string) => void;
  onShowSlideTemplates: () => void; // New prop
}

export function EditorToolbar({ onToolSelect, onAction, onShowSlideTemplates }: EditorToolbarProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="bg-card border-b p-2 flex items-center space-x-1 shadow-sm sticky top-0 z-40">
        {/* Element Tools */}
        {editorTools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onToolSelect(tool.id)} aria-label={tool.label}>
                <tool.icon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        <Separator orientation="vertical" className="h-6 mx-2" />
        
        {/* Slide Templates Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onShowSlideTemplates} aria-label="Slide Templates">
              <LayoutTemplate className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Slide Templates</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-2" />


        {/* Action Tools */}
        {actionTools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onAction(tool.id)} aria-label={tool.label}>
                <tool.icon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* AI Tools */}
        {aiTools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onToolSelect(tool.id)} aria-label={tool.label} className="text-accent hover:text-accent/90">
                <tool.icon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="flex-grow" /> {/* Spacer */}

        {/* Presentation Actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onAction("comments")} aria-label="Toggle Comments">
              <MessageSquare className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Comments</p>
          </TooltipContent>
        </Tooltip>

        <Button variant="default" size="sm" onClick={() => onAction("present")}>
          <Play className="mr-2 h-4 w-4" /> Present
        </Button>
      </div>
    </TooltipProvider>
  );
}
