
"use client";

import { useState } from 'react';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LifeBuoy, MessageSquareText, Bug, Lightbulb, BookOpen, MessageCircle, Bot, PlaySquare, Users } from 'lucide-react';
import { FeedbackDialog } from '@/components/support/FeedbackDialog';
import { AIChatbotWidget } from '@/components/support/AIChatbotWidget';

const faqItems = [
  {
    question: "How do I create a new presentation?",
    answer: "From your dashboard, click the 'Create New' button. You'll be taken directly to the editor with a new, untitled presentation."
  },
  {
    question: "Can I collaborate with my team?",
    answer: "Yes! You can invite team members to collaborate on presentations. Use the 'Share' button in the editor to manage collaborators and their permissions."
  },
  {
    question: "How do I use the AI Assistant features?",
    answer: "In the editor, open the AI Assistant panel (usually a sparkle icon). From there, you can access tools for content generation, design suggestions, text improvement, and more."
  },
  {
    question: "Where can I find my uploaded assets?",
    answer: "Navigate to your Dashboard, and you'll find a link or card for the 'Team Asset Library' where all your team's uploaded assets are stored and managed."
  },
  {
    question: "How do I export my presentation?",
    answer: "In the editor, click the 'Share' button. The Share Dialog provides options to export your presentation as PDF, PPTX, or a ZIP file of images."
  }
];

const tutorialTopics = [
  "Getting Started with CollabSlideSyncAI",
  "Mastering the Slide Editor",
  "Advanced Collaboration Techniques",
  "Leveraging AI for Maximum Impact",
  "Managing Your Team and Assets",
  "Sharing and Publishing Your Presentations"
];

export default function HelpCenterPage() {
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-12 text-center">
          <LifeBuoy className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="font-headline text-4xl font-bold text-primary">Help & Support Center</h1>
          <p className="text-muted-foreground mt-2 text-lg">Find answers to your questions and get help with CollabSlideSyncAI.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center"><MessageSquareText className="mr-2 h-6 w-6 text-primary" /> Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow bg-secondary/30">
            <CardHeader>
              <CardTitle className="flex items-center"><PlaySquare className="mr-2 h-6 w-6 text-primary" /> Video Tutorials & Guides</CardTitle>
              <CardDescription>Step-by-step guides to help you master CollabSlideSyncAI.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tutorialTopics.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 bg-background rounded-md border">
                    <span className="text-sm text-foreground/90">{topic}</span>
                    <Button variant="outline" size="sm" disabled>Watch (Soon)</Button>
                  </div>
                ))}
              </div>
              <p className="text-center text-primary font-semibold mt-4">More Tutorials Coming Soon!</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6 text-primary" /> Contact Support</CardTitle>
              <CardDescription>Need further assistance? Reach out to our support team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Email Support:</h4>
                <p className="text-sm text-muted-foreground">Reach us at <a href="mailto:support@collabslidesync.ai" className="text-primary hover:underline">support@collabslidesync.ai</a> (Placeholder)</p>
              </div>
              <div className="p-3 border rounded-md bg-muted/20">
                <h4 className="font-semibold text-sm mb-1">Live Chat Support:</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Get real-time help from our support agents.
                </p>
                <Button variant="secondary" className="w-full" disabled>
                  <MessageCircle className="mr-2 h-4 w-4" /> Live Chat (Coming Soon for Premium Users)
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow md:col-span-1 lg:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center"><Bot className="mr-2 h-6 w-6 text-primary" /> AI Chatbot Assistant</CardTitle>
                <CardDescription>Get instant answers to common questions.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-3">
                    Our AI assistant can help with general queries about using the platform.
                </p>
                <Button variant="default" onClick={() => setIsAIChatOpen(true)} className="w-full">
                    <Bot className="mr-2 h-4 w-4"/> Launch AI Chatbot
                </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center"><Bug className="mr-2 h-6 w-6 text-destructive" /> Report a Bug or Suggest a Feature</CardTitle>
              <CardDescription>Your feedback helps us improve CollabSlideSyncAI.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-3">
                Encountered an issue or have a great idea? We'd love to hear from you.
              </p>
              <Button variant="destructive" onClick={() => setIsFeedbackDialogOpen(true)} className="w-full">
                <Lightbulb className="mr-2 h-4 w-4" /> Submit Feedback / Bug Report
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <FeedbackDialog isOpen={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} />
        <AIChatbotWidget isOpen={isAIChatOpen} onOpenChange={setIsAIChatOpen} />

      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t mt-auto">
        © {new Date().getFullYear()} CollabSlideSyncAI. Help Center.
      </footer>
    </div>
  );
}

    
