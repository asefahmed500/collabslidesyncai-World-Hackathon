
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb, Palette, Sparkles, Wand2 } from 'lucide-react';
import { suggestDesignLayout, SuggestDesignLayoutInput, SuggestDesignLayoutOutput } from '@/ai/flows/design-assistant';
import { getSmartSuggestions, SmartSuggestionsInput, SmartSuggestionsOutput } from '@/ai/flows/smart-suggestions';
import type { Slide, Presentation as PresentationType } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth'; // To get team branding potentially

interface AIAssistantPanelProps {
  currentSlide: Slide | null;
  currentPresentation: PresentationType | null;
}

export function AIAssistantPanel({ currentSlide, currentPresentation }: AIAssistantPanelProps) {
  const [designSuggestions, setDesignSuggestions] = useState<SuggestDesignLayoutOutput | null>(null);
  const [smartTips, setSmartTips] = useState<SmartSuggestionsOutput | null>(null);
  const [isLoadingDesign, setIsLoadingDesign] = useState(false);
  const [isLoadingTips, setIsLoadingTips] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Potentially use for team branding info later

  const handleSuggestDesign = async () => {
    if (!currentSlide) {
      toast({ title: "Error", description: "No slide selected.", variant: "destructive" });
      return;
    }
    setIsLoadingDesign(true);
    setDesignSuggestions(null);
    try {
      const slideContent = currentSlide.elements.map(el => el.type === 'text' ? el.content : `[${el.type}]`).join('\n');
      
      // TODO: Fetch team branding dynamically if available via currentUser or presentation.teamId
      const teamBrandColors = "#3F51B5,#9C27B0,#E8EAF6"; // Placeholder
      const teamBrandFonts = "Space Grotesk,PT Sans"; // Placeholder

      const input: SuggestDesignLayoutInput = {
        slideContent: slideContent || "Empty slide",
        teamBrandColors: teamBrandColors,
        teamBrandFonts: teamBrandFonts,
      };
      const result = await suggestDesignLayout(input);
      setDesignSuggestions(result);
    } catch (error) {
      console.error("Error getting design suggestions:", error);
      toast({ title: "AI Error", description: "Could not fetch design suggestions.", variant: "destructive" });
    } finally {
      setIsLoadingDesign(false);
    }
  };

  const handleGetSmartTips = async () => {
    if (!currentPresentation) {
       toast({ title: "Error", description: "No presentation loaded.", variant: "destructive" });
      return;
    }
    setIsLoadingTips(true);
    setSmartTips(null);
    try {
      const presentationContent = currentPresentation.slides.map((s, idx) => 
        `Slide ${idx + 1}:\n${s.elements.map(el => el.type === 'text' ? el.content : `[${el.type}]`).join('\n')}`
      ).join('\n\n');

      // TODO: Fetch team branding dynamically
      const teamBrandGuidelines = `Colors: #3F51B5, #9C27B0. Fonts: Space Grotesk, PT Sans. Tone: Professional and engaging.`; // Placeholder

      const input: SmartSuggestionsInput = {
        presentationContent: presentationContent || "Empty presentation",
        teamBrandGuidelines: teamBrandGuidelines
      };
      const result = await getSmartSuggestions(input);
      setSmartTips(result);
    } catch (error) {
      console.error("Error getting smart tips:", error);
      toast({ title: "AI Error", description: "Could not fetch smart tips.", variant: "destructive" });
    } finally {
      setIsLoadingTips(false);
    }
  };

  const renderLoadingSkeletons = (count: number = 3) => (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="p-3 border rounded-md">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-card border-l w-80 h-full flex flex-col shadow-md">
      <div className="p-4 border-b">
        <h2 className="font-headline text-xl font-semibold flex items-center text-primary">
          <Sparkles className="mr-2 h-5 w-5" /> AI Assistant
        </h2>
      </div>
      <Tabs defaultValue="design" className="flex-grow flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-2 mt-2 self-center" style={{width: 'calc(100% - 1rem)'}}>
          <TabsTrigger value="design"><Palette className="mr-2 h-4 w-4" />Design</TabsTrigger>
          <TabsTrigger value="smarts"><Lightbulb className="mr-2 h-4 w-4" />Smart Tips</TabsTrigger>
        </TabsList>
        
        <TabsContent value="design" className="flex-grow flex flex-col p-4 space-y-4 overflow-hidden">
          <Button onClick={handleSuggestDesign} disabled={isLoadingDesign || !currentSlide} className="w-full">
            <Wand2 className="mr-2 h-4 w-4" /> {isLoadingDesign ? "Generating Designs..." : "Suggest Designs for Current Slide"}
          </Button>
          <ScrollArea className="flex-grow pr-2">
            {isLoadingDesign && renderLoadingSkeletons()}
            {!isLoadingDesign && designSuggestions && (
              <div className="space-y-3">
                <Card>
                  <CardHeader><CardTitle className="text-base">Layout Ideas</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {designSuggestions.layoutSuggestions.map((s, i) => <p key={i}>- {s}</p>)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Color Schemes</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {designSuggestions.colorSchemeSuggestions.map((s, i) => <p key={i}>- {s}</p>)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Spacing Tips</CardTitle></CardHeader>
                  <CardContent className="text-sm">
                    <p>{designSuggestions.spacingRecommendations}</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {!isLoadingDesign && !designSuggestions && <p className="text-sm text-muted-foreground text-center pt-4">Click button to get design suggestions for the current slide.</p>}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="smarts" className="flex-grow flex flex-col p-4 space-y-4 overflow-hidden">
          <Button onClick={handleGetSmartTips} disabled={isLoadingTips || !currentPresentation} className="w-full">
            <Wand2 className="mr-2 h-4 w-4" /> {isLoadingTips ? "Analyzing Presentation..." : "Get Smart Tips for Presentation"}
          </Button>
          <ScrollArea className="flex-grow pr-2">
            {isLoadingTips && renderLoadingSkeletons()}
            {!isLoadingTips && smartTips && (
              <div className="space-y-3">
                {smartTips.suggestions.map((tip, i) => (
                  <Card key={i}>
                    <CardContent className="p-3 text-sm">
                      <p>{tip}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {!isLoadingTips && !smartTips && <p className="text-sm text-muted-foreground text-center pt-4">Click button to get smart suggestions for the entire presentation.</p>}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
