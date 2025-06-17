
"use client";

import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { SlideElement, Slide, SlideComment } from '@/types';
import { Text, Image as ImageIcon, Shapes, MessageSquare, Send, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Textarea } from '../ui/textarea';
// Removed: Palette, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline as they are not fully implemented.

interface PropertiesPanelProps {
  selectedElement: SlideElement | null;
  currentSlide: Slide | null; // Keep currentSlide to access comments
  onUpdateElement: (updatedElement: Partial<SlideElement>) => void;
  onAddComment: (text: string) => void;
  onResolveComment: (commentId: string) => void;
}

export function PropertiesPanel({
  selectedElement,
  currentSlide, // Passed for comments
  onUpdateElement,
  onAddComment,
  onResolveComment,
}: PropertiesPanelProps) {
  // Local state for element properties to allow editing before "applying"
  // For simplicity, we'll directly call onUpdateElement on change.
  // A more robust solution might use a local state and an "Apply" button or debounce.
  // const [elementProps, setElementProps] = useState<Partial<SlideElement>>({});

  const [newComment, setNewComment] = useState("");

  // No longer need useEffect for elementProps if directly updating
  // useEffect(() => {
  //   if (selectedElement) {
  //     setElementProps({ ...selectedElement });
  //   } else {
  //     setElementProps({});
  //   }
  // }, [selectedElement]);

  const handleInputChange = (prop: keyof SlideElement, value: any) => {
    if (!selectedElement) return;
    onUpdateElement({ id: selectedElement.id, [prop]: value });
  };

  const handleStyleChange = (styleProp: keyof SlideElement['style'], value: any) => {
    if (!selectedElement) return;
    const updatedStyle = { ...(selectedElement.style || {}), [styleProp]: value };
    onUpdateElement({ id: selectedElement.id, style: updatedStyle });
  };
  
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment("");
    }
  };


  const renderElementProperties = () => {
    if (!selectedElement) return <p className="text-muted-foreground text-sm p-4">Select an element to edit its properties.</p>;

    // Use selectedElement directly for values, as updates are propagated up.
    const currentProps = selectedElement; 
    const currentStyle = selectedElement.style || {};


    return (
      <div className="space-y-4 p-4">
        <h3 className="font-semibold text-lg flex items-center">
          {selectedElement.type === 'text' && <Text className="mr-2 h-5 w-5" />}
          {selectedElement.type === 'image' && <ImageIcon className="mr-2 h-5 w-5" />}
          {selectedElement.type === 'shape' && <Shapes className="mr-2 h-5 w-5" />}
          Properties: <span className="font-mono text-sm ml-2 bg-muted px-1.5 py-0.5 rounded">{selectedElement.id.slice(0,8)}</span>
        </h3>

        <Accordion type="multiple" defaultValue={['appearance', 'layout']} className="w-full">
          <AccordionItem value="appearance">
            <AccordionTrigger className="text-base">Appearance</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              {selectedElement.type === 'text' && (
                <>
                  <div>
                    <Label htmlFor="content">Text Content</Label>
                    <Textarea
                      id="content"
                      value={currentProps.content || ''}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fontFamily">Font Family</Label>
                    <Select value={currentStyle.fontFamily || 'PT Sans'} onValueChange={(val) => handleStyleChange('fontFamily', val)}>
                      <SelectTrigger id="fontFamily" className="mt-1">
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PT Sans">PT Sans</SelectItem>
                        <SelectItem value="Space Grotesk">Space Grotesk</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fontSize">Font Size (px)</Label>
                    <Input
                      id="fontSize"
                      type="number"
                      value={parseInt(currentStyle.fontSize || '16')}
                      onChange={(e) => handleStyleChange('fontSize', `${e.target.value}px`)}
                      className="mt-1"
                    />
                  </div>
                  {/* Text Style and Alignment buttons removed for brevity, can be re-added */}
                </>
              )}
               {(selectedElement.type === 'shape' || selectedElement.type === 'text') && (
                <div>
                  <Label htmlFor="color">Text Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={currentStyle.color || '#000000'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="mt-1 h-10 p-1"
                  />
                </div>
              )}
              {(selectedElement.type === 'shape' || selectedElement.type === 'text') && (
                <div>
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={currentStyle.backgroundColor || '#ffffff'}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="mt-1 h-10 p-1"
                  />
                </div>
              )}
               {selectedElement.type === 'image' && (
                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    value={currentProps.content || ''}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    className="mt-1"
                    placeholder="https://example.com/image.png"
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="layout">
            <AccordionTrigger className="text-base">Layout & Position</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="posX">Position X (px)</Label>
                <Input id="posX" type="number" value={currentProps.position?.x || 0} onChange={(e) => handleInputChange('position', { ...currentProps.position, x: parseInt(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="posY">Position Y (px)</Label>
                <Input id="posY" type="number" value={currentProps.position?.y || 0} onChange={(e) => handleInputChange('position', { ...currentProps.position, y: parseInt(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="width">Width (px)</Label>
                <Input id="width" type="number" value={currentProps.size?.width || 100} onChange={(e) => handleInputChange('size', { ...currentProps.size, width: parseInt(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="height">Height (px)</Label>
                <Input id="height" type="number" value={currentProps.size?.height || 100} onChange={(e) => handleInputChange('size', { ...currentProps.size, height: parseInt(e.target.value) })} className="mt-1" />
              </div>
               <div>
                <Label htmlFor="zIndex">Stack Order (z-index)</Label>
                <Input id="zIndex" type="number" value={currentProps.zIndex || 0} onChange={(e) => handleInputChange('zIndex', parseInt(e.target.value))} className="mt-1" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  };
  
  const renderSlideComments = () => {
    if (!currentSlide) return null; // Ensure currentSlide is available
    const comments = currentSlide.comments || [];

    return (
      <div className="p-4 border-t">
        <h3 className="font-semibold text-lg mb-3 flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" /> Comments ({comments.filter(c => !c.resolved).length} active)
        </h3>
        <ScrollArea className="h-[200px] mb-3 pr-2">
          {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments on this slide yet.</p>}
          <ul className="space-y-3">
            {comments.map(comment => (
              <li key={comment.id} className={`text-sm p-2 rounded-md ${comment.resolved ? 'bg-muted/30 opacity-70' : 'bg-muted/50'}`}>
                <div className="flex items-center mb-1">
                   <Avatar className="w-5 h-5 mr-2">
                      <AvatarImage src={comment.userAvatarUrl} alt={comment.userName} data-ai-hint="profile avatar small" />
                      <AvatarFallback className="text-xs">{comment.userName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  <span className="font-semibold">{comment.userName}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {comment.createdAt ? new Date(comment.createdAt as Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : ''}
                  </span>
                </div>
                <p className={`ml-7 ${comment.resolved ? 'line-through' : ''}`}>{comment.text}</p>
                {!comment.resolved && (
                  <Button variant="link" size="sm" className="ml-7 p-0 h-auto text-primary hover:text-primary/80" onClick={() => onResolveComment(comment.id)}>Resolve</Button>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
        <form onSubmit={handleCommentSubmit} className="space-y-2">
          <Textarea 
            placeholder="Add a comment..." 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
          />
          <Button type="submit" size="sm" className="w-full" disabled={!newComment.trim()}>
            <Send className="mr-2 h-4 w-4" /> Send Comment
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-card border-l w-80 h-full flex flex-col shadow-md">
      <ScrollArea className="flex-grow">
        {renderElementProperties()}
        {renderSlideComments()}
      </ScrollArea>
    </div>
  );
}
