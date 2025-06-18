
"use client";

import { useState } from 'react';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LifeBuoy, MessageSquareQuestion, Bug, Lightbulb, BookOpen, MessageCircle, Bot } from 'lucide-react';
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
  }
];

export default function HelpCenterPage() {
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8 text-center">
          <LifeBuoy className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="font-headline text-4xl font-bold text-primary">Help & Support Center</h1>
          <p className="text-muted-foreground mt-2">Find answers to your questions and get help with CollabSlideSyncAI.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center"><MessageSquareQuestion className="mr-2 h-6 w-6 text-primary" /> Frequently Asked Questions</CardTitle>
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

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center"><BookOpen className="mr-2 h-6 w-6 text-primary" /> Tutorials & Guides</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Learn how to get the most out of CollabSlideSyncAI with our step-by-step tutorials.
              </p>
              <Button variant="outline" disabled>Browse Tutorials (Coming Soon)</Button>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-3 space-y-1 pl-2">
                <li>Getting Started Guide</li>
                <li>Using the AI Assistant</li>
                <li>Collaboration Best Practices</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center"><MessageCircle className="mr-2 h-6 w-6 text-primary" /> Contact Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div>
                <h4 className="font-semibold text-sm">Email Support:</h4>
                <p className="text-sm text-muted-foreground">support@collabslidesync.ai (Placeholder)</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Live Chat:</h4>
                <p className="text-sm text-muted-foreground">Available for premium users. (Coming Soon)</p>
                <Button variant="secondary" size="sm" className="mt-1" disabled>Start Live Chat</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow md:col-span-1 lg:col-span-1">
            <CardHeader>
                <CardTitle className="flex items-center"><Bot className="mr-2 h-6 w-6 text-primary" /> AI Chatbot Assistant</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">
                    Get instant answers to common questions from our AI-powered assistant.
                </p>
                <Button variant="default" onClick={() => setIsAIChatOpen(true)}>
                    <Bot className="mr-2 h-4 w-4"/> Launch AI Chatbot
                </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center"><Bug className="mr-2 h-6 w-6 text-destructive" /> Report a Bug or Suggest a Feature</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Help us improve! If you've found a bug or have an idea for a new feature, please let us know.
              </p>
              <Button variant="destructive" onClick={() => setIsFeedbackDialogOpen(true)}>
                <Lightbulb className="mr-2 h-4 w-4" /> Submit Feedback / Bug Report
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <FeedbackDialog isOpen={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} />
        <AIChatbotWidget isOpen={isAIChatOpen} onOpenChange={setIsAIChatOpen} />

      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        © {new Date().getFullYear()} CollabSlideSyncAI. Help Center.
      </footer>
    </div>
  );
}
