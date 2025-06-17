"use client";

import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { SlideElement, Slide, SlideComment } from '@/types';
import { Text, Image as ImageIcon, Shapes, Palette, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, MessageSquare, Send, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Textarea } from '../ui/textarea';

interface PropertiesPanelProps {
  selectedElement: SlideElement | null;
  currentSlide: Slide | null;
  onUpdateElement: (updatedElement: Partial<SlideElement>) => void; // For mock updates
  onAddComment: (text: string) => void;
  onResolveComment: (commentId: string) => void;
}

export function PropertiesPanel({
  selectedElement,
  currentSlide,
  onUpdateElement,
  onAddComment,
  onResolveComment,
}: PropertiesPanelProps) {
  const [elementProps, setElementProps] = useState<Partial<SlideElement>>({});
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (selectedElement) {
      setElementProps({ ...selectedElement });
    } else {
      setElementProps({});
    }
  }, [selectedElement]);

  const handleInputChange = (prop: keyof SlideElement, value: any) => {
    const updated = { ...elementProps, [prop]: value };
    setElementProps(updated);
    // In a real app, debounce this or have an "Apply" button
    onUpdateElement({ id: selectedElement?.id, [prop]: value });
  };

  const handleStyleChange = (styleProp: keyof SlideElement['style'], value: any) => {
    const updatedStyle = { ...elementProps.style, [styleProp]: value };
    const updated = { ...elementProps, style: updatedStyle };
    setElementProps(updated);
    onUpdateElement({ id: selectedElement?.id, style: updatedStyle });
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
                      value={elementProps.content || ''}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fontFamily">Font Family</Label>
                    <Select value={elementProps.style?.fontFamily || 'PT Sans'} onValueChange={(val) => handleStyleChange('fontFamily', val)}>
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
                      value={parseInt(elementProps.style?.fontSize || '16')}
                      onChange={(e) => handleStyleChange('fontSize', `${e.target.value}px`)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Text Style</Label>
                    <div className="flex space-x-1 mt-1">
                        <Button variant="outline" size="icon"><Bold className="w-4 h-4"/></Button>
                        <Button variant="outline" size="icon"><Italic className="w-4 h-4"/></Button>
                        <Button variant="outline" size="icon"><Underline className="w-4 h-4"/></Button>
                    </div>
                  </div>
                  <div>
                    <Label>Alignment</Label>
                     <div className="flex space-x-1 mt-1">
                        <Button variant="outline" size="icon"><AlignLeft className="w-4 h-4"/></Button>
                        <Button variant="outline" size="icon"><AlignCenter className="w-4 h-4"/></Button>
                        <Button variant="outline" size="icon"><AlignRight className="w-4 h-4"/></Button>
                    </div>
                  </div>
                </>
              )}
               {(selectedElement.type === 'shape' || selectedElement.type === 'text') && (
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={elementProps.style?.color || '#000000'}
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
                    value={elementProps.style?.backgroundColor || '#ffffff'}
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
                    value={elementProps.content || ''}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    className="mt-1"
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
                <Input id="posX" type="number" value={elementProps.position?.x || 0} onChange={(e) => handleInputChange('position', { ...elementProps.position, x: parseInt(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="posY">Position Y (px)</Label>
                <Input id="posY" type="number" value={elementProps.position?.y || 0} onChange={(e) => handleInputChange('position', { ...elementProps.position, y: parseInt(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="width">Width (px)</Label>
                <Input id="width" type="number" value={elementProps.size?.width || 100} onChange={(e) => handleInputChange('size', { ...elementProps.size, width: parseInt(e.target.value) })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="height">Height (px)</Label>
                <Input id="height" type="number" value={elementProps.size?.height || 100} onChange={(e) => handleInputChange('size', { ...elementProps.size, height: parseInt(e.target.value) })} className="mt-1" />
              </div>
               <div>
                <Label htmlFor="zIndex">Stack Order (z-index)</Label>
                <Input id="zIndex" type="number" value={elementProps.zIndex || 0} onChange={(e) => handleInputChange('zIndex', parseInt(e.target.value))} className="mt-1" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  };
  
  const renderSlideComments = () => {
    if (!currentSlide) return null;
    return (
      <div className="p-4 border-t">
        <h3 className="font-semibold text-lg mb-3 flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" /> Comments
        </h3>
        <ScrollArea className="h-[200px] mb-3 pr-2">
          {currentSlide.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments on this slide yet.</p>}
          <ul className="space-y-3">
            {currentSlide.comments.map(comment => (
              <li key={comment.id} className="text-sm p-2 bg-muted/50 rounded-md">
                <div className="flex items-center mb-1">
                  <UserCircle className="w-5 h-5 mr-2 text-muted-foreground" />
                  <span className="font-semibold">{comment.userName}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="ml-7">{comment.text}</p>
                {!comment.resolved && (
                  <Button variant="link" size="sm" className="ml-7 p-0 h-auto" onClick={() => onResolveComment(comment.id)}>Resolve</Button>
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
