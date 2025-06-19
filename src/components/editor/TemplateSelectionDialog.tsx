
"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { slideTemplates, type SlideTemplate } from "@/lib/slideTemplates";
import Image from "next/image";
import { CheckCircle, LayoutTemplate } from "lucide-react";

interface TemplateSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (templateKey: string) => void;
}

export function TemplateSelectionDialog({ isOpen, onOpenChange, onSelectTemplate }: TemplateSelectionDialogProps) {
  
  const handleTemplateSelect = (templateKey: string) => {
    onSelectTemplate(templateKey);
    onOpenChange(false); // Close dialog after selection
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl font-headline flex items-center">
            <LayoutTemplate className="mr-3 h-6 w-6 text-primary" /> Choose a Slide Template
          </DialogTitle>
          <DialogDescription>
            Select a template to add a new slide with a pre-defined layout.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow my-4 pr-3 -mr-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slideTemplates.map((template) => (
              <Card 
                key={template.key} 
                className="hover:shadow-lg transition-shadow cursor-pointer group flex flex-col"
                onClick={() => handleTemplateSelect(template.key)}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleTemplateSelect(template.key)}
                role="button"
                aria-label={`Select ${template.name} template`}
              >
                <CardHeader className="p-0">
                  <div className="aspect-[16/9] bg-muted rounded-t-lg overflow-hidden relative">
                    <Image 
                      src={template.previewImageUrl || "https://placehold.co/160x90.png?text=Preview"} 
                      alt={template.name} 
                      layout="fill" 
                      objectFit="cover"
                      data-ai-hint="template preview"
                      className="transition-transform group-hover:scale-105"
                    />
                     <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 flex-grow">
                  <CardTitle className="text-md font-semibold group-hover:text-primary transition-colors">{template.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{template.description}</CardDescription>
                </CardContent>
                <div className="p-3 pt-0">
                    <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <CheckCircle className="mr-2 h-4 w-4"/> Select Template
                    </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
