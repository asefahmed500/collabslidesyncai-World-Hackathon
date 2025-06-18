
"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Type, // Text
  Square, // Shape (generic, can represent rectangle)
  Circle as CircleIcon, // Shape (Circle)
  Image as ImageIcon,
  BarChart3 as BarChartIcon, // Updated icon
  Smile, // Icon for general icons
  Palette, // Colors / AI Design
  CaseSensitive, // Fonts
  Copy, // Duplicate
  Trash2, // Delete
  Undo,
  Redo,
  Play, // Present
  Settings2, // AI settings maybe
  Lightbulb, // AI Content Writer
  MessageSquare, // Comments
  LayoutTemplate, // For templates
} from "lucide-react";

const editorTools = [
  { id: "text", label: "Text", icon: Type },
  { id: "shape-rectangle", label: "Rectangle", icon: Square },
  { id: "shape-circle", label: "Circle", icon: CircleIcon },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "chart", label: "Chart (Placeholder)", icon: BarChartIcon },
  { id: "icon", label: "Icon (Placeholder)", icon: Smile },
];

const actionTools = [
  { id: "undo", label: "Undo (Soon)", icon: Undo },
  { id: "redo", label: "Redo (Soon)", icon: Redo },
];

const aiTools = [
  { id: "ai-design", label: "AI Design Assist", icon: Palette },
  { id: "ai-content", label: "AI Content Writer", icon: Lightbulb },
];


interface EditorToolbarProps {
  onToolSelect: (tool: string | null) => void; // Allow null to deselect tool
  onAction: (action: string) => void;
  onShowSlideTemplates: () => void;
  selectedTool: string | null;
}

export function EditorToolbar({ onToolSelect, onAction, onShowSlideTemplates, selectedTool }: EditorToolbarProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="bg-card border-b p-2 flex items-center space-x-1 shadow-sm sticky top-16 z-30"> {/* Adjusted top for site header */}
        {/* Element Tools */}
        {editorTools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === tool.id ? "secondary" : "ghost"}
                size="icon"
                onClick={() => onToolSelect(selectedTool === tool.id ? null : tool.id)}
                aria-label={tool.label}
                aria-pressed={selectedTool === tool.id}
              >
                <tool.icon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        <Separator orientation="vertical" className="h-6 mx-2" />
        
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

        {actionTools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onAction(tool.id)} aria-label={tool.label} disabled>
                <tool.icon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        <Separator orientation="vertical" className="h-6 mx-2" />

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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onAction("comments")} aria-label="Toggle Comments Panel">
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
