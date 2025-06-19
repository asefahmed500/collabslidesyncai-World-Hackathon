
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqItems = [
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, Apple Pay, and Google Pay through our secure payment processor, Stripe."
  },
  {
    question: "Can I cancel my subscription at any time?",
    answer: "Yes, you can cancel your Premium subscription at any time. You will retain access to premium features until the end of your current billing period."
  },
  {
    question: "How is my data secured?",
    answer: "We take data security seriously. All presentations are stored securely, and we use industry-standard encryption. Payment information is handled by Stripe, a PCI-compliant processor."
  },
  {
    question: "How many team members can I invite?",
    answer: "The Free plan has limits on team members. Premium plans offer more generous limits. Please check our pricing details for specifics."
  },
  {
    question: "Do you offer support if I need help?",
    answer: "Yes! All users have access to our FAQ and AI Chatbot. Premium users get priority email and live chat support."
  }
];

export function FaqSection() {
  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="container px-4 md:px-6 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="w-full space-y-3">
          {faqItems.map((item, index) => (
            <AccordionItem value={`item-${index}`} key={index} className="border-b-0 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
              <AccordionTrigger className="px-6 py-4 text-left text-base hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 text-sm text-foreground/70">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
