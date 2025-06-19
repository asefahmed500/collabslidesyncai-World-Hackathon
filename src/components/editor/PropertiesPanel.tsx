
"use client";

import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { SlideElement, Slide, SlideComment, SlideElementStyle, ChartContent, IconContent, ChartType } from '@/types';
import { Text, Image as ImageIcon, Shapes, MessageSquare, Send, Palette, UserCircleIcon, Lock, CaseSensitive, AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline, Trash2, BarChart3, Smile as SmileIcon, Info } from 'lucide-react';
import { useState, ChangeEvent, useEffect } from 'react';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface PropertiesPanelProps {
  selectedElement: SlideElement | null;
  currentSlide: Slide | null;
  onUpdateElement: (updatedElementPartial: Partial<SlideElement>) => void;
  onDeleteElement: (elementId: string) => void;
  onAddComment: (text: string) => void;
  onResolveComment: (commentId: string) => void;
  onUpdateSlideBackgroundColor: (color: string) => void;
  disabled?: boolean;
  currentUserId: string;
}

export function PropertiesPanel({
  selectedElement,
  currentSlide,
  onUpdateElement,
  onDeleteElement,
  onAddComment,
  onResolveComment,
  onUpdateSlideBackgroundColor,
  disabled,
  currentUserId,
}: PropertiesPanelProps) {
  const [newComment, setNewComment] = useState("");
  const [localStyle, setLocalStyle] = useState<SlideElementStyle | null>(null);
  const [localContent, setLocalContent] = useState<string | ChartContent | IconContent | any | null>(null);

  useEffect(() => {
    if (selectedElement) {
      setLocalStyle(selectedElement.style || {});
      setLocalContent(selectedElement.content);
    } else {
      setLocalStyle(null);
      setLocalContent(null);
    }
  }, [selectedElement]);

  const isElementLockedByOther = selectedElement?.lockedBy && selectedElement.lockedBy !== currentUserId;
  const effectiveDisabled = disabled || isElementLockedByOther;

  const handleInputChange = (prop: keyof SlideElement, value: any) => {
    if (!selectedElement || effectiveDisabled) return;
    onUpdateElement({ id: selectedElement.id, [prop]: value });
  };

  const handleStyleChange = (styleProp: keyof SlideElementStyle | 'data-ai-hint', value: any) => {
    if (!selectedElement || effectiveDisabled) return;
    const updatedStyle = { ...(localStyle || selectedElement.style || {}), [styleProp]: value };
    setLocalStyle(updatedStyle);
    onUpdateElement({ id: selectedElement.id, style: updatedStyle });
  };

  const handleContentChange = (value: string | ChartContent | IconContent | any) => {
    if (!selectedElement || effectiveDisabled) return;
    setLocalContent(value); // Update local state for controlled components
    onUpdateElement({ id: selectedElement.id, content: value });
  };

  const handleChartContentChange = (chartProp: keyof ChartContent, value: any) => {
    if (!selectedElement || effectiveDisabled || selectedElement.type !== 'chart') return;
    const currentChartContent = (localContent || selectedElement.content) as ChartContent;
    const updatedChartContent: ChartContent = { ...currentChartContent, [chartProp]: value };
    handleContentChange(updatedChartContent);
  };
  
  const handleIconContentChange = (iconProp: keyof IconContent, value: any) => {
    if (!selectedElement || effectiveDisabled || selectedElement.type !== 'icon') return;
    const currentIconContent = (localContent || selectedElement.content) as IconContent;
    const updatedIconContent: IconContent = { ...currentIconContent, [iconProp]: value };
    handleContentChange(updatedIconContent);
  };


  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment("");
  };

  const handleDeleteSelectedElement = () => {
    if (selectedElement && !effectiveDisabled) {
        onDeleteElement(selectedElement.id);
    }
  };

  const renderElementProperties = () => {
    if (!selectedElement) {
        return (
            <div className="space-y-4 p-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <Palette className="mr-2 h-5 w-5" /> Slide Properties
                </h3>
                 <Accordion type="single" collapsible defaultValue="appearance" className="w-full">
                    <AccordionItem value="appearance">
                        <AccordionTrigger className="text-base">Appearance</AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                            <div>
                                <Label htmlFor="slideBackgroundColor">Slide Background Color</Label>
                                <Input
                                    id="slideBackgroundColor"
                                    type="color"
                                    value={currentSlide?.backgroundColor || '#FFFFFF'}
                                    onChange={(e) => currentSlide && onUpdateSlideBackgroundColor(e.target.value)}
                                    className="mt-1 h-10 p-1"
                                    disabled={disabled || !currentSlide}
                                />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                 </Accordion>
                 <p className="text-muted-foreground text-sm p-4 text-center">Select an element to edit its properties.</p>
            </div>
        );
    }

    const currentProps = selectedElement;
    const currentStyle = localStyle || selectedElement.style || {};
    const currentElementContent = localContent === undefined || localContent === null ? selectedElement.content : localContent;


    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center">
            {selectedElement.type === 'text' && <Text className="mr-2 h-5 w-5" />}
            {selectedElement.type === 'image' && <ImageIcon className="mr-2 h-5 w-5" />}
            {selectedElement.type === 'shape' && <Shapes className="mr-2 h-5 w-5" />}
            {selectedElement.type === 'chart' && <BarChart3 className="mr-2 h-5 w-5" />}
            {selectedElement.type === 'icon' && <SmileIcon className="mr-2 h-5 w-5" />}
            Properties
            {isElementLockedByOther && <Lock title={`Locked by ${selectedElement.lockedBy === currentUserId ? 'you' : 'another user'}`} className="ml-2 h-4 w-4 text-destructive" />}
            </h3>
            <Button variant="ghost" size="icon" onClick={handleDeleteSelectedElement} disabled={effectiveDisabled} title="Delete Element">
                <Trash2 className="h-4 w-4 text-destructive"/>
            </Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-3">ID: <span className="font-mono">{selectedElement.id.slice(0,8)}...</span></p>
        {isElementLockedByOther && <p className="text-xs text-destructive">This element is locked by another user.</p>}


        <Accordion type="multiple" defaultValue={['content', 'appearance', 'layout']} className="w-full">
          {selectedElement.type === 'text' && (
            <AccordionItem value="content">
                <AccordionTrigger className="text-base">Content</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                     <div>
                        <Label htmlFor="content">Text</Label>
                        <Textarea
                        id="content"
                        value={typeof currentElementContent === 'string' ? currentElementContent : ''}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleContentChange(e.target.value)}
                        className="mt-1"
                        rows={4}
                        disabled={effectiveDisabled}
                        />
                    </div>
                </AccordionContent>
            </AccordionItem>
          )}
           {selectedElement.type === 'image' && (
             <AccordionItem value="content">
                <AccordionTrigger className="text-base">Image Source</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                    <div>
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                        id="imageUrl"
                        value={typeof currentElementContent === 'string' ? currentElementContent : ''}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleContentChange(e.target.value)}
                        className="mt-1"
                        placeholder="https://example.com/image.png"
                        disabled={effectiveDisabled}
                    />
                    </div>
                    <div>
                        <Label htmlFor="imageAiHint">AI Image Hint (max 2 words)</Label>
                        <Input
                            id="imageAiHint"
                            value={(currentStyle as any)['data-ai-hint'] || ''}
                            onChange={(e) => handleStyleChange('data-ai-hint', e.target.value)}
                            className="mt-1"
                            placeholder="e.g. office team"
                            disabled={effectiveDisabled}
                            maxLength={30} 
                        />
                    </div>
                </AccordionContent>
             </AccordionItem>
          )}
          {selectedElement.type === 'chart' && (
             <AccordionItem value="content">
                <AccordionTrigger className="text-base">Chart Data & Type</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                    {(currentElementContent as ChartContent)?.aiSuggestionNotes && (
                        <div className="p-2.5 mb-2 text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
                            <p className="font-semibold flex items-center"><Info className="h-3.5 w-3.5 mr-1.5"/>AI Suggestion Notes:</p>
                            <pre className="whitespace-pre-wrap font-mono text-xs leading-snug mt-1">{ (currentElementContent as ChartContent).aiSuggestionNotes}</pre>
                        </div>
                    )}
                    <div>
                        <Label htmlFor="chartType">Chart Type</Label>
                        <Select 
                            value={(currentElementContent as ChartContent)?.type || 'bar'} 
                            onValueChange={(val) => handleChartContentChange('type', val as ChartType)} 
                            disabled={effectiveDisabled}
                        >
                            <SelectTrigger id="chartType" className="mt-1">
                                <SelectValue placeholder="Select chart type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bar">Bar Chart</SelectItem>
                                <SelectItem value="line">Line Chart</SelectItem>
                                <SelectItem value="pie">Pie Chart</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label htmlFor="chartLabel">Chart Label / Title</Label>
                        <Input
                            id="chartLabel"
                            value={(currentElementContent as ChartContent)?.label || ''}
                            onChange={(e) => handleChartContentChange('label', e.target.value)}
                            className="mt-1"
                            placeholder="e.g., Quarterly Sales"
                            disabled={effectiveDisabled}
                        />
                    </div>
                    <div>
                        <Label htmlFor="chartData">Chart Data (JSON)</Label>
                        <Textarea
                            id="chartData"
                            value={typeof (currentElementContent as ChartContent)?.data === 'object' ? JSON.stringify((currentElementContent as ChartContent).data, null, 2) : ''}
                            onChange={(e) => {
                                try {
                                    const parsedData = JSON.parse(e.target.value);
                                    handleChartContentChange('data', parsedData);
                                } catch (err) {
                                    // Handle invalid JSON, maybe show an error
                                    console.warn("Invalid JSON for chart data");
                                }
                            }}
                            className="mt-1 font-mono text-xs"
                            rows={5}
                            placeholder={`[{"name": "A", "value": 10}, ... ]`}
                            disabled={effectiveDisabled}
                        />
                    </div>
                </AccordionContent>
             </AccordionItem>
          )}
           {selectedElement.type === 'icon' && (
             <AccordionItem value="content">
                <AccordionTrigger className="text-base">Icon Properties</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                    <div>
                        <Label htmlFor="iconName">Icon Name (Lucide)</Label>
                        <Input
                            id="iconName"
                            value={(currentElementContent as IconContent)?.name || ''}
                            onChange={(e) => handleIconContentChange('name', e.target.value)}
                            className="mt-1"
                            placeholder="e.g., home, settings, check"
                            disabled={effectiveDisabled}
                        />
                         <p className="text-xs text-muted-foreground mt-1">Find names at <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" className="text-primary underline">lucide.dev/icons</a></p>
                    </div>
                </AccordionContent>
             </AccordionItem>
          )}

          <AccordionItem value="appearance">
            <AccordionTrigger className="text-base">Appearance</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              {selectedElement.type === 'text' && (
                <>
                  <div>
                    <Label htmlFor="fontFamily">Font Family</Label>
                    <Select value={currentStyle.fontFamily || 'PT Sans'} onValueChange={(val) => handleStyleChange('fontFamily', val)} disabled={effectiveDisabled}>
                      <SelectTrigger id="fontFamily" className="mt-1">
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PT Sans">PT Sans</SelectItem>
                        <SelectItem value="Space Grotesk">Space Grotesk</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Courier New">Courier New</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label htmlFor="fontSize">Font Size (px)</Label>
                        <Input id="fontSize" type="number" value={parseInt(String(currentStyle.fontSize || '16').replace('px',''))} onChange={(e) => handleStyleChange('fontSize', `${e.target.value}px`)} className="mt-1" disabled={effectiveDisabled} min="1"/>
                    </div>
                    <div>
                      <Label htmlFor="color">Text Color</Label>
                      <Input id="color" type="color" value={currentStyle.color || '#000000'} onChange={(e) => handleStyleChange('color', e.target.value)} className="mt-1 h-10 p-1" disabled={effectiveDisabled} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Text Alignment</Label>
                    <div className="flex gap-1">
                        {(['left', 'center', 'right'] as const).map(align => (
                            <Button key={align} variant={currentStyle.textAlign === align ? "secondary" : "outline"} size="icon" onClick={() => handleStyleChange('textAlign', align)} disabled={effectiveDisabled} title={`Align ${align}`}>
                                {align === 'left' && <AlignLeft/>} {align === 'center' && <AlignCenter/>} {align === 'right' && <AlignRight/>}
                            </Button>
                        ))}
                    </div>
                  </div>
                   <div className="space-y-1">
                    <Label>Text Style</Label>
                    <div className="flex gap-1">
                        <Button variant={currentStyle.fontWeight === 'bold' ? "secondary" : "outline"} size="icon" onClick={() => handleStyleChange('fontWeight', currentStyle.fontWeight === 'bold' ? 'normal' : 'bold')} disabled={effectiveDisabled} title="Bold">
                            <Bold/>
                        </Button>
                         <Button variant={currentStyle.fontStyle === 'italic' ? "secondary" : "outline"} size="icon" onClick={() => handleStyleChange('fontStyle', currentStyle.fontStyle === 'italic' ? 'normal' : 'italic')} disabled={effectiveDisabled} title="Italic">
                            <Italic/>
                        </Button>
                         <Button variant={currentStyle.textDecoration === 'underline' ? "secondary" : "outline"} size="icon" onClick={() => handleStyleChange('textDecoration', currentStyle.textDecoration === 'underline' ? 'none' : 'underline')} disabled={effectiveDisabled} title="Underline">
                            <Underline/>
                        </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="textBackgroundColor">Background Color</Label>
                    <Input
                        id="textBackgroundColor"
                        type="color"
                        value={currentStyle.backgroundColor || '#00000000'}
                        onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                        className="mt-1 h-10 p-1"
                        disabled={effectiveDisabled}
                    />
                  </div>
                </>
              )}
              {selectedElement.type === 'shape' && (
                 <div>
                  <Label htmlFor="shapeBackgroundColor">Fill Color</Label>
                  <Input
                    id="shapeBackgroundColor"
                    type="color"
                    value={currentStyle.backgroundColor || '#CCCCCC'}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="mt-1 h-10 p-1"
                    disabled={effectiveDisabled}
                  />
                </div>
              )}
              {selectedElement.type === 'icon' && (
                <>
                  <div>
                    <Label htmlFor="iconSize">Icon Size (px, like font size)</Label>
                    <Input id="iconSize" type="number" value={parseInt(String(currentStyle.fontSize || '48').replace('px',''))} onChange={(e) => handleStyleChange('fontSize', `${e.target.value}px`)} className="mt-1" disabled={effectiveDisabled} min="8"/>
                  </div>
                   <div>
                      <Label htmlFor="iconColor">Icon Color</Label>
                      <Input id="iconColor" type="color" value={currentStyle.color || '#000000'} onChange={(e) => handleStyleChange('color', e.target.value)} className="mt-1 h-10 p-1" disabled={effectiveDisabled} />
                    </div>
                </>
              )}
              {selectedElement.type === 'shape' && (
                <>
                    <div>
                        <Label htmlFor="borderColor">Border Color</Label>
                        <Input id="borderColor" type="color" value={currentStyle.borderColor || '#000000'} onChange={(e) => handleStyleChange('borderColor', e.target.value)} className="mt-1 h-10 p-1" disabled={effectiveDisabled} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="borderWidth">Border Width (px)</Label>
                            <Input id="borderWidth" type="number" value={currentStyle.borderWidth || 1} onChange={(e) => handleStyleChange('borderWidth', parseInt(e.target.value))} className="mt-1" disabled={effectiveDisabled} min="0"/>
                        </div>
                        <div>
                            <Label htmlFor="borderRadius">Border Radius (px)</Label>
                            <Input id="borderRadius" type="number" value={currentStyle.borderRadius || 0} onChange={(e) => handleStyleChange('borderRadius', parseInt(e.target.value))} className="mt-1" disabled={effectiveDisabled} min="0"/>
                        </div>
                    </div>
                 </>
              )}
               <div>
                    <Label htmlFor="opacity">Opacity (0-1)</Label>
                    <Input id="opacity" type="number" value={currentStyle.opacity === undefined ? 1 : currentStyle.opacity} onChange={(e) => handleStyleChange('opacity', parseFloat(e.target.value))} className="mt-1" disabled={effectiveDisabled} min="0" max="1" step="0.1"/>
                </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="layout">
            <AccordionTrigger className="text-base">Layout & Position</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="posX">X (px)</Label>
                <Input id="posX" type="number" value={currentProps.position?.x || 0} onChange={(e) => handleInputChange('position', { ...currentProps.position, x: parseInt(e.target.value) })} className="mt-1" disabled={effectiveDisabled} />
              </div>
              <div>
                <Label htmlFor="posY">Y (px)</Label>
                <Input id="posY" type="number" value={currentProps.position?.y || 0} onChange={(e) => handleInputChange('position', { ...currentProps.position, y: parseInt(e.target.value) })} className="mt-1" disabled={effectiveDisabled} />
              </div>
              <div>
                <Label htmlFor="width">Width (px)</Label>
                <Input id="width" type="number" value={currentProps.size?.width || 100} onChange={(e) => handleInputChange('size', { ...currentProps.size, width: parseInt(e.target.value) })} className="mt-1" disabled={effectiveDisabled} min="10" />
              </div>
              <div>
                <Label htmlFor="height">Height (px)</Label>
                <Input id="height" type="number" value={currentProps.size?.height || 100} onChange={(e) => handleInputChange('size', { ...currentProps.size, height: parseInt(e.target.value) })} className="mt-1" disabled={effectiveDisabled} min="10" />
              </div>
               <div>
                <Label htmlFor="zIndex">Stack Order (z)</Label>
                <Input id="zIndex" type="number" value={currentProps.zIndex || 0} onChange={(e) => handleInputChange('zIndex', parseInt(e.target.value))} className="mt-1" disabled={effectiveDisabled} />
              </div>
               <div>
                <Label htmlFor="rotation">Rotation (&deg;)</Label>
                <Input id="rotation" type="number" value={currentProps.rotation || 0} onChange={(e) => handleInputChange('rotation', parseInt(e.target.value))} className="mt-1" disabled={effectiveDisabled} />
              </div>
            </AccordionContent>
          </AccordionItem>
           <AccordionItem value="slideAppearanceGlobal">
            <AccordionTrigger className="text-base">Slide Background</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
                <div>
                    <Label htmlFor="slideBackgroundColorPanel">Color</Label>
                    <Input
                        id="slideBackgroundColorPanel"
                        type="color"
                        value={currentSlide?.backgroundColor || '#FFFFFF'}
                        onChange={(e) => currentSlide && onUpdateSlideBackgroundColor(e.target.value)}
                        className="mt-1 h-10 p-1"
                        disabled={disabled || !currentSlide}
                    />
                </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  };

  const renderSlideComments = () => {
    if (!currentSlide) return null;
    const comments = currentSlide.comments || [];

    return (
      <div className="p-4 border-t">
        <h3 className="font-semibold text-lg mb-3 flex items-center">
          <MessageSquare className="mr-2 h-5 w-5" /> Comments ({comments.filter(c => !c.resolved).length} active)
        </h3>
        <ScrollArea className="h-[200px] mb-3 pr-2">
          {comments.length === 0 && <p className="text-sm text-muted-foreground text-center pt-2">No comments on this slide yet.</p>}
          <ul className="space-y-3">
            {comments.map(comment => (
              <li key={comment.id} className={`text-sm p-2.5 rounded-md shadow-sm ${comment.resolved ? 'bg-muted/30 opacity-70' : 'bg-card border'}`}>
                <div className="flex items-start mb-1.5">
                   <Avatar className="w-6 h-6 mr-2.5 mt-0.5">
                      <AvatarImage src={comment.userAvatarUrl || undefined} alt={comment.userName} data-ai-hint="profile avatar small"/>
                      <AvatarFallback className="text-xs">
                        {comment.userName ? comment.userName.charAt(0).toUpperCase() : <UserCircleIcon size={12}/>}
                      </AvatarFallback>
                    </Avatar>
                  <div className="flex-grow">
                    <span className="font-semibold text-sm">{comment.userName}</span>
                    <p className={`text-xs text-muted-foreground ${comment.resolved ? 'line-through' : ''}`}>{comment.text}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {comment.createdAt ? new Date(comment.createdAt as any).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : ''}
                  </span>
                </div>
                {!comment.resolved && (
                  <Button variant="link" size="sm" className="ml-[34px] p-0 h-auto text-xs text-primary hover:text-primary/80" onClick={() => !disabled && onResolveComment(comment.id)} disabled={disabled}>Resolve</Button>
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
            className="text-sm"
            disabled={disabled}
          />
          <Button type="submit" size="sm" className="w-full" disabled={disabled || !newComment.trim()}>
            <Send className="mr-2 h-4 w-4" /> Send Comment
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-card border-l w-80 md:w-96 h-full flex flex-col shadow-md">
      <ScrollArea className="flex-grow">
        {renderElementProperties()}
        {currentSlide && renderSlideComments()}
      </ScrollArea>
    </div>
  );
}
