
"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Bot, User, Send, MessageSquareDashed, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chatbotAssistant, ChatbotAssistantInput, ChatbotAssistantOutput } from '@/ai/flows/chatbot-assistant-flow';
import { useToast } from '@/hooks/use-toast';


interface AIChatbotWidgetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export function AIChatbotWidget({ isOpen, onOpenChange }: AIChatbotWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'initial-bot-message', sender: 'bot', text: "Hello! I'm the CollabSlideSyncAI Assistant. How can I help you with our presentation tool today?", timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
    if (scrollAreaRef.current) {
      // Access the viewport element directly
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);


  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    const currentMessageForAI = inputText;
    setInputText('');
    setIsTyping(true);

    try {
      const aiInput: ChatbotAssistantInput = { userMessage: currentMessageForAI };
      const aiResponse: ChatbotAssistantOutput = await chatbotAssistant(aiInput);
      
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: aiResponse.botResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);

    } catch (error: any) {
      console.error("Error calling chatbot flow:", error);
      toast({
        title: "AI Error",
        description: error.message || "Could not get a response from the AI assistant. Please try again.",
        variant: "destructive",
      });
       const errorBotResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorBotResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center text-lg">
            <Bot className="mr-2 h-6 w-6 text-primary" /> AI Support Assistant
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef as any}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-end space-x-2 max-w-[85%]",
                msg.sender === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
              )}
            >
              <Avatar className={cn("h-7 w-7", msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                 {msg.sender === 'bot' && <AvatarImage src="https://placehold.co/40x40.png?text=AI" alt="AI Bot" data-ai-hint="bot avatar" />}
                <AvatarFallback>
                  {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "p-2.5 rounded-lg text-sm shadow",
                  msg.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-muted-foreground rounded-bl-none'
                )}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <p className={cn("text-xs mt-1", msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground/70', msg.sender === 'user' ? 'text-right' : 'text-left')}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-end space-x-2">
                <Avatar className="h-7 w-7 bg-muted">
                    <AvatarImage src="https://placehold.co/40x40.png?text=AI" alt="AI Bot Typing" data-ai-hint="bot avatar typing"/>
                    <AvatarFallback><Bot size={16} /></AvatarFallback>
                </Avatar>
                <div className="p-2.5 rounded-lg text-sm shadow bg-muted text-muted-foreground rounded-bl-none">
                    <MessageSquareDashed className="h-5 w-5 animate-pulse" />
                </div>
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t bg-background">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSendMessage()}
              className="flex-grow"
              disabled={isTyping}
            />
            <Button onClick={handleSendMessage} disabled={!inputText.trim() || isTyping} size="icon">
              {isTyping ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
