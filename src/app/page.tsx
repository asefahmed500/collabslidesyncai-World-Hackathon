
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Zap, Users, Edit3, BarChartBig, ShieldCheck, Sparkles, MousePointerSquareDashed, CheckCircle, Star, TrendingUp, Youtube, MessageCircle, Info, Code, ArrowRight, PlayCircle, UserPlus } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PricingCardClient } from '@/components/landing/PricingCardClient'; // Import the new client component

const keyFeatures = [
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Real-time Collaboration",
    description: "Work together seamlessly with your team, seeing changes live and commenting instantly.",
    dataAiHint: "team collaboration"
  },
  {
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: "AI-Powered Assistance",
    description: "Leverage AI for smart design suggestions, content generation, and text enhancements.",
    dataAiHint: "artificial intelligence"
  },
  {
    icon: <MousePointerSquareDashed className="h-8 w-8 text-primary" />,
    title: "Intuitive Slide Editor",
    description: "An easy-to-use drag & drop editor that lets you focus on your content, not complex tools.",
    dataAiHint: "user interface"
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: "Secure Sharing",
    description: "Control who sees your work with public/private links, password protection, and embed options.",
    dataAiHint: "data security"
  },
  {
    icon: <BarChartBig className="h-8 w-8 text-primary" />,
    title: "Insightful Analytics",
    description: "Track presentation views, engagement, and AI usage to optimize your impact.",
    dataAiHint: "data analytics"
  }
];

const howItWorksSteps = [
  { title: "Sign Up Free", description: "Create your account in seconds.", icon: <UserPlus className="h-8 w-8 text-primary"/> },
  { title: "Create Team", description: "Set up your team or join an existing one.", icon: <Users className="h-8 w-8 text-primary"/> },
  { title: "Build Slides", description: "Use our intuitive editor and AI tools.", icon: <Edit3 className="h-8 w-8 text-primary"/> },
  { title: "Collaborate", description: "Work together in real-time with your team.", icon: <TrendingUp className="h-8 w-8 text-primary"/> },
  { title: "Share & Present", description: "Deliver impactful presentations online or offline.", icon: <Youtube className="h-8 w-8 text-primary"/> },
];

export const pricingPlans = [ // Export for use in client component
  {
    name: "Free",
    price: "$0",
    period: "/ month",
    features: ["Up to 3 presentations", "Basic AI features", "Limited collaboration", "Standard support"],
    cta: "Get Started",
    href: "/signup",
    variant: "outline" as "outline" | "default",
    highlight: false,
  },
  {
    name: "Premium Monthly",
    price: "$12",
    period: "/ month",
    features: ["Unlimited presentations", "Advanced AI features", "Full collaboration tools", "Priority support", "Custom branding options"],
    cta: "Upgrade to Monthly",
    href: "/signup?plan=premium_monthly", // Example, actual link might be different
    variant: "default" as "default",
    highlight: true,
  },
  {
    name: "Premium Yearly",
    price: "$120",
    period: "/ year",
    features: ["All Premium Monthly features", "Save 15% with annual billing", "Early access to new features", "Dedicated account manager (future)"],
    cta: "Upgrade to Yearly",
    href: "/signup?plan=premium_yearly", // Example
    variant: "outline" as "outline",
    highlight: false,
  }
];

const testimonials = [
  {
    quote: "CollabDeck has revolutionized how our team creates and delivers presentations. The AI features are a game-changer!",
    name: "Sarah L.",
    role: "Marketing Manager, Tech Solutions Inc.",
    avatar: "https://placehold.co/100x100.png?text=SL",
    dataAiHint: "profile woman"
  },
  {
    quote: "The real-time collaboration is incredibly smooth. We can build presentations so much faster now.",
    name: "John B.",
    role: "Project Lead, Creative Agency",
    avatar: "https://placehold.co/100x100.png?text=JB",
    dataAiHint: "profile man"
  },
  {
    quote: "Finally, an intuitive presentation tool that doesn't get in the way of creativity. Highly recommended!",
    name: "Maria K.",
    role: "Founder, Design Studio",
    avatar: "https://placehold.co/100x100.png?text=MK",
    dataAiHint: "profile person"
  },
];

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


export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Zap className="h-7 w-7 text-primary" />
            <span className="font-headline text-2xl font-bold text-primary">
              CollabDeck
            </span>
          </Link>
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {/* 1. Hero Section */}
        <section className="py-20 md:py-28 bg-gradient-to-br from-background via-secondary/10 to-background">
          <div className="container px-4 md:px-6 text-center">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl lg:text-7xl">
              Create Stunning Presentations Collaboratively with AI Power
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-foreground/80 md:text-xl">
              CollabDeck empowers your team to design, build, and deliver impactful presentations faster than ever with intelligent AI assistance and seamless real-time collaboration.
            </p>
            <div className="mt-10">
              <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow px-8 py-3 text-lg">
                <Link href="/signup">Get Started Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
            <div className="mt-16 relative aspect-video max-w-5xl mx-auto rounded-xl shadow-2xl overflow-hidden border-2 border-primary/20">
              <Image
                src="https://placehold.co/1280x720.png"
                alt="CollabDeck Application Interface Mockup"
                layout="fill"
                objectFit="cover"
                data-ai-hint="app interface presentation"
                priority
              />
               <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
            </div>
          </div>
        </section>

        {/* 2. Key Features Preview Section */}
        <section id="features" className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
                Everything You Need for Impactful Presentations
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-md text-foreground/70">
                From real-time teamwork to AI-driven enhancements, CollabDeck is built for modern presentation needs.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {keyFeatures.map((feature) => (
                <Card key={feature.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out bg-card flex flex-col">
                  <CardHeader className="items-start">
                    <div className="p-3 bg-primary/10 rounded-lg mb-3 inline-block">
                      {feature.icon}
                    </div>
                    <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-foreground/70">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 3. How It Works Section */}
        <section id="how-it-works" className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
                Get Started in Minutes
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-md text-foreground/70">
                Follow our simple flow to start creating and collaborating.
              </p>
            </div>
            <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 items-start">
              {howItWorksSteps.map((step, index) => (
                <div key={step.title} className="flex flex-col items-center text-center p-4">
                  <div className="p-4 bg-primary/10 rounded-full mb-4 ring-2 ring-primary/20">
                    {step.icon}
                  </div>
                  <h3 className="font-headline text-lg font-semibold mb-1">{index + 1}. {step.title}</h3>
                  <p className="text-sm text-foreground/70">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Live Product Demo or Preview Section */}
        <section id="demo" className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
                See CollabDeck in Action
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-md text-foreground/70">
                Watch a quick overview of our editor, collaboration tools, and AI features. (Demo video placeholder)
              </p>
            </div>
            <div className="relative aspect-video max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden border-2 border-primary/20 group">
              <Image
                src="https://placehold.co/1200x675.png"
                alt="CollabDeck Product Demo Video Thumbnail"
                layout="fill"
                objectFit="cover"
                data-ai-hint="product demo video"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <PlayCircle className="h-20 w-20 text-white/80 group-hover:text-white" />
              </div>
            </div>
          </div>
        </section>

        {/* 5. Pricing Section */}
        <section id="pricing" className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
                Simple, Transparent Pricing
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-md text-foreground/70">
                Choose the plan that’s right for you. Upgrade, downgrade, or cancel anytime.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:gap-6 lg:grid-cols-3 items-end max-w-5xl mx-auto">
              {pricingPlans.map((plan) => (
                <PricingCardClient key={plan.name} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        {/* 6. Testimonials / Social Proof */}
        <section id="testimonials" className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
                Loved by Teams Worldwide
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.name} className="bg-card shadow-lg p-6">
                  <div className="flex items-start space-x-4">
                    <Image src={testimonial.avatar} alt={testimonial.name} width={48} height={48} className="rounded-full" data-ai-hint={testimonial.dataAiHint}/>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  <blockquote className="mt-4 text-foreground/80 italic border-l-4 border-primary pl-4 py-2">
                    "{testimonial.quote}"
                  </blockquote>
                </Card>
              ))}
            </div>
            <div className="mt-16 text-center">
              <h3 className="text-xl font-semibold text-foreground/90 mb-8">Trusted by innovative companies of all sizes:</h3>
              <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
                {[...Array(5)].map((_, i) => (
                  <Image key={i} src={`https://placehold.co/120x60.png?text=Logo${i+1}`} alt={`Client Logo ${i+1}`} width={120} height={60} className="opacity-70 hover:opacity-100 transition-opacity" data-ai-hint="company logo grey" />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 7. FAQ Section */}
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

      </main>

      {/* Footer */}
      <footer className="py-12 border-t bg-muted/50">
        <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <Link href="/" className="flex items-center space-x-2 mb-4">
                        <Zap className="h-7 w-7 text-primary" />
                        <span className="font-headline text-2xl font-bold text-primary">CollabDeck</span>
                    </Link>
                    <p className="text-sm text-foreground/70">Craft, collaborate, and captivate with AI-powered presentations.</p>
                </div>
                <div>
                    <h4 className="font-semibold mb-3 text-foreground">Product</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="#features" className="text-foreground/70 hover:text-primary">Features</Link></li>
                        <li><Link href="#pricing" className="text-foreground/70 hover:text-primary">Pricing</Link></li>
                        <li><Link href="#demo" className="text-foreground/70 hover:text-primary">Demo</Link></li>
                        <li><Link href="/login" className="text-foreground/70 hover:text-primary">Login</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold mb-3 text-foreground">Company</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="#" className="text-foreground/70 hover:text-primary">About Us (Placeholder)</Link></li>
                        <li><Link href="#" className="text-foreground/70 hover:text-primary">Careers (Placeholder)</Link></li>
                        <li><Link href="#" className="text-foreground/70 hover:text-primary">Contact Us (Placeholder)</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold mb-3 text-foreground">Legal & Support</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="#" className="text-foreground/70 hover:text-primary">Terms of Service</Link></li>
                        <li><Link href="#" className="text-foreground/70 hover:text-primary">Privacy Policy</Link></li>
                        <li><Link href="/dashboard/help" className="text-foreground/70 hover:text-primary">Support Center</Link></li>
                    </ul>
                </div>
            </div>
            <Separator className="my-8" />
            <div className="flex flex-col md:flex-row justify-between items-center text-sm text-foreground/60">
                <p>&copy; {new Date().getFullYear()} CollabDeck. All rights reserved.</p>
                <div className="flex space-x-4 mt-4 md:mt-0">
                    <Link href="#" className="hover:text-primary"><MessageCircle className="h-5 w-5" /></Link>
                    <Link href="#" className="hover:text-primary"><Info className="h-5 w-5" /></Link>
                    <Link href="#" className="hover:text-primary"><Code className="h-5 w-5" /></Link>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}
