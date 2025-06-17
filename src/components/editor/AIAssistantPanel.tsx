
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Lightbulb, Palette, Sparkles, Wand2, Edit, FileText, Type, AlignLeft, Loader2, LayoutDashboard } from 'lucide-react';

import { suggestDesignLayout, SuggestDesignLayoutInput, SuggestDesignLayoutOutput } from '@/ai/flows/design-assistant';
import { getSmartSuggestions, SmartSuggestionsInput, SmartSuggestionsOutput } from '@/ai/flows/smart-suggestions';
import { improveText, ImproveTextInput, ImproveTextOutput } from '@/ai/flows/text-improvement-flow';
import { generateContent, GenerateContentInput, GenerateContentOutput } from '@/ai/flows/content-generation-flow';
import { adjustTone, AdjustToneInput, AdjustToneOutput } from '@/ai/flows/tone-adjustment-flow';
import { generateSpeakerNotes, GenerateSpeakerNotesInput, GenerateSpeakerNotesOutput } from '@/ai/flows/speaker-notes-flow';

import type { Slide, Presentation as PresentationType, SlideElement } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface AIAssistantPanelProps {
  currentSlide: Slide | null;
  currentPresentation: PresentationType | null;
  selectedElement: SlideElement | null;
  onApplyAITextUpdate?: (elementId: string, newContent: string) => void;
  onApplyAISpeakerNotes?: (notes: string) => void;
}

export function AIAssistantPanel({ 
    currentSlide, 
    currentPresentation, 
    selectedElement,
    onApplyAITextUpdate,
    onApplyAISpeakerNotes 
}: AIAssistantPanelProps) {
  const { toast } = useToast();

  // Design Assistant State
  const [designSuggestions, setDesignSuggestions] = useState<SuggestDesignLayoutOutput | null>(null);
  const [isLoadingDesign, setIsLoadingDesign] = useState(false);

  // Smart Tips State
  const [smartTips, setSmartTips] = useState<SmartSuggestionsOutput | null>(null);
  const [isLoadingTips, setIsLoadingTips] = useState(false);

  // Text Improvement State
  const [textToImprove, setTextToImprove] = useState('');
  const [improvementType, setImprovementType] = useState<'grammar' | 'clarity' | 'professionalism' | 'conciseness'>('clarity');
  const [improvedTextResult, setImprovedTextResult] = useState<ImproveTextOutput | null>(null);
  const [isLoadingImproveText, setIsLoadingImproveText] = useState(false);

  // Content Generation State
  const [contentGenInput, setContentGenInput] = useState('');
  const [contentGenType, setContentGenType] = useState<'bullet_points_from_content' | 'rewrite_content' | 'summarize_content' | 'bullet_points_from_topic'>('rewrite_content');
  const [contentGenTopic, setContentGenTopic] = useState('');
  const [contentGenInstructions, setContentGenInstructions] = useState('');
  const [generatedContentResult, setGeneratedContentResult] = useState<GenerateContentOutput | null>(null);
  const [isLoadingGenContent, setIsLoadingGenContent] = useState(false);
  
  // Tone Adjustment State
  const [textToAdjust, setTextToAdjust] = useState('');
  const [targetTone, setTargetTone] = useState<'formal' | 'casual' | 'enthusiastic' | 'neutral'>('formal');
  const [adjustedToneResult, setAdjustedToneResult] = useState<AdjustToneOutput | null>(null);
  const [isLoadingAdjustTone, setIsLoadingAdjustTone] = useState(false);

  // Speaker Notes State
  const [generatedSpeakerNotes, setGeneratedSpeakerNotes] = useState<GenerateSpeakerNotesOutput | null>(null);
  const [isLoadingSpeakerNotes, setIsLoadingSpeakerNotes] = useState(false);
  
  useEffect(() => {
    if (selectedElement && selectedElement.type === 'text') {
      setTextToImprove(selectedElement.content);
      setContentGenInput(selectedElement.content);
      setTextToAdjust(selectedElement.content);
    } else {
      setTextToImprove('');
      setContentGenInput('');
      setTextToAdjust('');
    }
  }, [selectedElement]);


  const handleSuggestDesign = async () => {
    if (!currentSlide) {
      toast({ title: "Error", description: "No slide selected for design suggestions.", variant: "destructive" });
      return;
    }
    setIsLoadingDesign(true); setDesignSuggestions(null);
    try {
      let slideContentForAI = `Slide Number: ${currentSlide.slideNumber}\n`;
      if (currentSlide.elements.length === 0) {
        slideContentForAI += "This slide is currently empty.";
      } else {
        currentSlide.elements.forEach(el => {
          if (el.type === 'text') {
            slideContentForAI += `TEXT_ELEMENT: "${el.content}" (Size: ${el.size.width}x${el.size.height} at ${el.position.x},${el.position.y})\n`;
          } else {
            slideContentForAI += `[${el.type.toUpperCase()}_ELEMENT] (Size: ${el.size.width}x${el.size.height} at ${el.position.x},${el.position.y})\n`;
          }
        });
      }

      const input: SuggestDesignLayoutInput = {
        slideContent: slideContentForAI,
        teamBrandColors: currentPresentation?.branding?.primaryColor ? `${currentPresentation.branding.primaryColor}${currentPresentation.branding.secondaryColor ? ',' + currentPresentation.branding.secondaryColor : ''}` : undefined,
        teamBrandFonts: currentPresentation?.branding?.fontPrimary ? `${currentPresentation.branding.fontPrimary}${currentPresentation.branding.fontSecondary ? ',' + currentPresentation.branding.fontSecondary : ''}`: undefined,
      };
      const result = await suggestDesignLayout(input);
      setDesignSuggestions(result);
      toast({ title: "Design Suggestions Ready", description: "AI has provided design ideas for your slide."});
    } catch (e: any) { toast({ title: "AI Design Error", description: e.message || "Could not fetch design suggestions.", variant: "destructive" });}
    finally { setIsLoadingDesign(false); }
  };

  const handleGetSmartTips = async () => {
    if (!currentPresentation) {
       toast({ title: "Error", description: "No presentation loaded.", variant: "destructive" }); return;
    }
    setIsLoadingTips(true); setSmartTips(null);
    try {
      const presentationContent = currentPresentation.slides.map((s, idx) => 
        `Slide ${idx + 1} (ID: ${s.id}):\n${s.elements.map(el => el.type === 'text' ? `  - TEXT: "${el.content}"` : `  - [${el.type.toUpperCase()}]`).join('\n')}`
      ).join('\n\n');
      const input: SmartSuggestionsInput = {
        presentationContent: presentationContent || "Empty presentation",
        teamBrandGuidelines: `Colors: ${currentPresentation.branding?.primaryColor || 'default'}, Fonts: ${currentPresentation.branding?.fontPrimary || 'default'}`
      };
      const result = await getSmartSuggestions(input);
      setSmartTips(result);
      toast({ title: "Smart Tips Ready", description: "AI has provided tips for your presentation."});
    } catch (e: any) { toast({ title: "AI Tips Error", description: e.message || "Could not fetch smart tips.", variant: "destructive" }); }
    finally { setIsLoadingTips(false); }
  };

  const handleImproveText = async () => {
    if (!textToImprove.trim()) { toast({ title: "Input Missing", description: "Please enter text to improve.", variant: "destructive" }); return; }
    setIsLoadingImproveText(true); setImprovedTextResult(null);
    try {
      const result = await improveText({ textToImprove, improvementType });
      setImprovedTextResult(result);
      toast({ title: "Text Improved", description: "AI has suggested improvements."});
    } catch (e: any) { toast({ title: "AI Text Error", description: e.message || "Could not improve text.", variant: "destructive" });}
    finally { setIsLoadingImproveText(false); }
  };

  const handleGenerateContent = async () => {
    if ((contentGenType === 'bullet_points_from_content' || contentGenType === 'rewrite_content' || contentGenType === 'summarize_content') && !contentGenInput.trim()) {
      toast({ title: "Input Missing", description: "Please enter content for generation.", variant: "destructive" }); return;
    }
    if (contentGenType === 'bullet_points_from_topic' && !contentGenTopic.trim()) {
      toast({ title: "Input Missing", description: "Please enter a topic for bullet points.", variant: "destructive" }); return;
    }
    setIsLoadingGenContent(true); setGeneratedContentResult(null);
    try {
      const input: GenerateContentInput = {
        generationType: contentGenType,
        currentContent: contentGenInput || undefined,
        topic: contentGenType === 'bullet_points_from_topic' ? contentGenTopic : undefined,
        instructions: contentGenInstructions || undefined,
      };
      const result = await generateContent(input);
      setGeneratedContentResult(result);
      toast({ title: "Content Generated", description: "AI has generated new content."});
    } catch (e: any) { toast({ title: "AI Content Gen Error", description: e.message || "Could not generate content.", variant: "destructive" });}
    finally { setIsLoadingGenContent(false); }
  };

  const handleAdjustTone = async () => {
    if (!textToAdjust.trim()) { toast({ title: "Input Missing", description: "Please enter text to adjust tone.", variant: "destructive" }); return; }
    setIsLoadingAdjustTone(true); setAdjustedToneResult(null);
    try {
      const result = await adjustTone({ textToAdjust, targetTone });
      setAdjustedToneResult(result);
      toast({ title: "Tone Adjusted", description: "AI has adjusted the text tone."});
    } catch (e: any) { toast({ title: "AI Tone Error", description: e.message || "Could not adjust tone.", variant: "destructive" });}
    finally { setIsLoadingAdjustTone(false); }
  };
  
  const handleGenerateSpeakerNotes = async () => {
    if (!currentSlide) { toast({ title: "Error", description: "No slide selected.", variant: "destructive" }); return; }
    setIsLoadingSpeakerNotes(true); setGeneratedSpeakerNotes(null);
    try {
      const slideContent = currentSlide.elements.filter(el => el.type === 'text').map(el => el.content).join(' \n ');
      if (!slideContent.trim() && currentSlide.elements.length > 0) {
         toast({ title: "Info", description: "Current slide has non-text elements. Notes will be general.", variant: "default" });
      } else if (!slideContent.trim()) {
        toast({ title: "Info", description: "Current slide is empty or has no text content for specific speaker notes.", variant: "default" });
      }
      const input: GenerateSpeakerNotesInput = {
        slideContent: slideContent || "This slide may contain images or shapes. Please provide general speaker notes.",
        presentationContext: currentPresentation?.description || currentPresentation?.title
      };
      const result = await generateSpeakerNotes(input);
      setGeneratedSpeakerNotes(result);
      toast({ title: "Speaker Notes Generated", description: "AI has created speaker notes for this slide."});
    } catch (e: any) { toast({ title: "AI Notes Error", description: e.message || "Could not generate speaker notes.", variant: "destructive" });}
    finally { setIsLoadingSpeakerNotes(false); }
  };

  const renderLoadingSkeletons = (count: number = 2, itemHeight: string = "h-10") => (
    <div className="space-y-3 mt-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className={`p-3 border rounded-md bg-muted/30 ${itemHeight}`}>
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-card border-l w-80 md:w-96 h-full flex flex-col shadow-md">
      <div className="p-4 border-b">
        <h2 className="font-headline text-xl font-semibold flex items-center text-primary">
          <Sparkles className="mr-2 h-5 w-5" /> AI Assistant
        </h2>
      </div>
      <ScrollArea className="flex-grow">
        <Accordion type="multiple" defaultValue={['content-tools']} className="w-full">
          <AccordionItem value="design-layout">
            <AccordionTrigger className="px-4 py-3 text-base font-medium">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Design & Layout
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
                <Button onClick={handleSuggestDesign} disabled={isLoadingDesign || !currentSlide} className="w-full">
                    {isLoadingDesign ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Suggest Design for Current Slide
                </Button>
                {isLoadingDesign && renderLoadingSkeletons(3, "h-16")}
                {!isLoadingDesign && designSuggestions && (
                <div className="space-y-3 text-sm max-h-96 overflow-y-auto pr-2">
                    {designSuggestions.layoutSuggestions && designSuggestions.layoutSuggestions.length > 0 && (
                        <Card>
                            <CardHeader className="p-3"><CardTitle className="text-md">Layout Ideas</CardTitle></CardHeader>
                            <CardContent className="p-3 text-xs space-y-1.5">
                                {designSuggestions.layoutSuggestions.map((s, i) => <p key={`layout-${i}`} className="pb-1 border-b last:border-b-0">- {s}</p>)}
                            </CardContent>
                        </Card>
                    )}
                    {designSuggestions.colorSchemeSuggestions && designSuggestions.colorSchemeSuggestions.length > 0 && (
                        <Card>
                            <CardHeader className="p-3"><CardTitle className="text-md">Color Schemes</CardTitle></CardHeader>
                            <CardContent className="p-3 text-xs space-y-1.5">
                                {designSuggestions.colorSchemeSuggestions.map((s, i) => <p key={`color-${i}`} className="pb-1 border-b last:border-b-0">- {s}</p>)}
                            </CardContent>
                        </Card>
                    )}
                     {designSuggestions.fontRecommendations && (
                        <Card>
                            <CardHeader className="p-3"><CardTitle className="text-md">Font Tips</CardTitle></CardHeader>
                            <CardContent className="p-3 text-xs"><p>{designSuggestions.fontRecommendations}</p></CardContent>
                        </Card>
                    )}
                    {designSuggestions.spacingRecommendations && (
                        <Card>
                            <CardHeader className="p-3"><CardTitle className="text-md">Spacing & Alignment</CardTitle></CardHeader>
                            <CardContent className="p-3 text-xs"><p>{designSuggestions.spacingRecommendations}</p></CardContent>
                        </Card>
                    )}
                </div>
                )}
                {!isLoadingDesign && !designSuggestions && currentSlide && <p className="text-sm text-muted-foreground text-center pt-2">Click to get design suggestions for the current slide.</p>}
                 {!currentSlide && <p className="text-sm text-muted-foreground text-center pt-2">Select a slide to enable design suggestions.</p>}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="content-tools">
            <AccordionTrigger className="px-4 py-3 text-base font-medium">
                <Edit className="mr-2 h-4 w-4" /> Content & Writing
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <Tabs defaultValue="text-improve" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="text-improve"><Type className="mr-1 h-4 w-4" />Improve</TabsTrigger>
                  <TabsTrigger value="content-gen"><AlignLeft className="mr-1 h-4 w-4" />Generate</TabsTrigger>
                </TabsList>
                <TabsContent value="text-improve" className="space-y-3">
                  <Textarea placeholder="Paste text here or select a text element on slide..." value={textToImprove} onChange={(e) => setTextToImprove(e.target.value)} rows={4}/>
                  <Select value={improvementType} onValueChange={(v) => setImprovementType(v as any)}>
                    <SelectTrigger><SelectValue placeholder="Select improvement type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clarity">Clarity</SelectItem>
                      <SelectItem value="grammar">Grammar & Spelling</SelectItem>
                      <SelectItem value="professionalism">Professionalism</SelectItem>
                      <SelectItem value="conciseness">Conciseness</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleImproveText} disabled={isLoadingImproveText} className="w-full">
                    {isLoadingImproveText ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />} Improve Text
                  </Button>
                  {isLoadingImproveText && renderLoadingSkeletons(1)}
                  {improvedTextResult && (
                    <Card className="mt-2 bg-muted/50">
                      <CardHeader className="p-2"><CardTitle className="text-sm">Suggested Improvement:</CardTitle></CardHeader>
                      <CardContent className="p-2 text-sm">
                        <Textarea value={improvedTextResult.improvedText} readOnly rows={4} className="bg-background"/>
                        {improvedTextResult.explanation && <p className="text-xs text-muted-foreground mt-1">{improvedTextResult.explanation}</p>}
                        {selectedElement && selectedElement.type === 'text' && onApplyAITextUpdate && (
                             <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => onApplyAITextUpdate(selectedElement!.id, improvedTextResult.improvedText)}>Apply to Selected</Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                <TabsContent value="content-gen" className="space-y-3">
                    <Select value={contentGenType} onValueChange={(v) => {setContentGenType(v as any); setGeneratedContentResult(null);}}>
                        <SelectTrigger><SelectValue placeholder="Select generation type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="rewrite_content">Rewrite Content</SelectItem>
                            <SelectItem value="summarize_content">Summarize Content</SelectItem>
                            <SelectItem value="bullet_points_from_content">Bullets from Content</SelectItem>
                            <SelectItem value="bullet_points_from_topic">Bullets from Topic</SelectItem>
                        </SelectContent>
                    </Select>
                    {(contentGenType === 'rewrite_content' || contentGenType === 'summarize_content' || contentGenType === 'bullet_points_from_content') && (
                        <Textarea placeholder="Content to process..." value={contentGenInput} onChange={(e) => setContentGenInput(e.target.value)} rows={3}/>
                    )}
                    {contentGenType === 'bullet_points_from_topic' && (
                        <Input placeholder="Topic for bullet points..." value={contentGenTopic} onChange={(e) => setContentGenTopic(e.target.value)} />
                    )}
                    <Textarea placeholder="Optional: Specific instructions (e.g., 'make it more engaging', 'limit to 3 bullets')" value={contentGenInstructions} onChange={(e) => setContentGenInstructions(e.target.value)} rows={2}/>
                    <Button onClick={handleGenerateContent} disabled={isLoadingGenContent} className="w-full">
                        {isLoadingGenContent ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />} Generate
                    </Button>
                    {isLoadingGenContent && renderLoadingSkeletons(1)}
                    {generatedContentResult && (
                        <Card className="mt-2 bg-muted/50">
                        <CardHeader className="p-2"><CardTitle className="text-sm">Generated Content:</CardTitle></CardHeader>
                        <CardContent className="p-2 text-sm">
                            <Textarea value={generatedContentResult.generatedContent} readOnly rows={4} className="bg-background"/>
                             {selectedElement && selectedElement.type === 'text' && onApplyAITextUpdate && generatedContentResult.contentType === 'text' && (
                                <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => onApplyAITextUpdate(selectedElement!.id, generatedContentResult.generatedContent)}>Apply to Selected</Button>
                            )}
                        </CardContent>
                        </Card>
                    )}
                </TabsContent>
              </Tabs>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="tone-adjust">
                  <AccordionTrigger className="text-sm py-2">Adjust Tone</AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-3">
                    <Textarea placeholder="Text to adjust tone..." value={textToAdjust} onChange={(e) => setTextToAdjust(e.target.value)} rows={3}/>
                    <Select value={targetTone} onValueChange={(v) => setTargetTone(v as any)}>
                      <SelectTrigger><SelectValue placeholder="Select target tone" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAdjustTone} disabled={isLoadingAdjustTone} className="w-full">
                      {isLoadingAdjustTone ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />} Adjust Tone
                    </Button>
                    {isLoadingAdjustTone && renderLoadingSkeletons(1)}
                    {adjustedToneResult && (
                      <Card className="mt-2 bg-muted/50">
                        <CardHeader className="p-2"><CardTitle className="text-sm">Adjusted Text:</CardTitle></CardHeader>
                        <CardContent className="p-2 text-sm">
                          <Textarea value={adjustedToneResult.adjustedText} readOnly rows={3} className="bg-background"/>
                          {selectedElement && selectedElement.type === 'text' && onApplyAITextUpdate && (
                                <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => onApplyAITextUpdate(selectedElement!.id, adjustedToneResult.adjustedText)}>Apply to Selected</Button>
                            )}
                        </CardContent>
                      </Card>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="slide-tools">
            <AccordionTrigger className="px-4 py-3 text-base font-medium">
                <FileText className="mr-2 h-4 w-4" /> Slide Specific
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <Tabs defaultValue="speaker-notes" className="w-full">
                  <TabsList className="grid w-full grid-cols-1 mb-3"> {/* Changed to 1 col for single item */}
                    <TabsTrigger value="speaker-notes"><Lightbulb className="mr-1 h-4 w-4" />Speaker Notes</TabsTrigger>
                  </TabsList>
                  <TabsContent value="speaker-notes" className="space-y-3">
                    <Button onClick={handleGenerateSpeakerNotes} disabled={isLoadingSpeakerNotes || !currentSlide} className="w-full">
                        {isLoadingSpeakerNotes ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Generate Speaker Notes
                    </Button>
                    {isLoadingSpeakerNotes && renderLoadingSkeletons(1)}
                    {generatedSpeakerNotes && (
                        <Card className="mt-2 bg-muted/50">
                        <CardHeader className="p-2"><CardTitle className="text-sm">Generated Speaker Notes:</CardTitle></CardHeader>
                        <CardContent className="p-2 text-sm">
                            <Textarea value={generatedSpeakerNotes.speakerNotes} readOnly rows={5} className="bg-background"/>
                            {onApplyAISpeakerNotes && (
                                <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => onApplyAISpeakerNotes(generatedSpeakerNotes.speakerNotes)}>Apply to Slide Notes</Button>
                            )}
                        </CardContent>
                        </Card>
                    )}
                     {!isLoadingSpeakerNotes && !generatedSpeakerNotes && currentSlide && <p className="text-sm text-muted-foreground text-center pt-2">Click to generate speaker notes for the current slide.</p>}
                     {!currentSlide && <p className="text-sm text-muted-foreground text-center pt-2">Select a slide to enable speaker notes generation.</p>}
                  </TabsContent>
              </Tabs>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="presentation-smarts">
            <AccordionTrigger className="px-4 py-3 text-base font-medium">
                <Lightbulb className="mr-2 h-4 w-4" /> Presentation Smart Tips
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
                <Button onClick={handleGetSmartTips} disabled={isLoadingTips || !currentPresentation} className="w-full">
                    {isLoadingTips ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Get Smart Tips for Presentation
                </Button>
                {isLoadingTips && renderLoadingSkeletons()}
                {!isLoadingTips && smartTips && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {smartTips.suggestions.map((tip, i) => (
                    <Card key={i} className="bg-muted/30"><CardContent className="p-3 text-sm"><p>- {tip}</p></CardContent></Card>
                    ))}
                     {smartTips.suggestions.length === 0 && <p className="text-sm text-muted-foreground text-center">No specific tips at the moment.</p>}
                </div>
                )}
                {!isLoadingTips && !smartTips && currentPresentation && <p className="text-sm text-muted-foreground text-center pt-2">Click to get smart tips for the entire presentation.</p>}
                {!currentPresentation && <p className="text-sm text-muted-foreground text-center pt-2">Load a presentation to get smart tips.</p>}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>
    </div>
  );
}

