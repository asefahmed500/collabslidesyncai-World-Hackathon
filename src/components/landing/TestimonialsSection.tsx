
import Image from 'next/image';
import { Card } from '@/components/ui/card';

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

const companyLogos = [
  { src: "https://placehold.co/120x50.png?text=InnovateCorp", alt: "InnovateCorp Logo", dataAiHint:"company logo grey" },
  { src: "https://placehold.co/110x45.png?text=SolutionsIO", alt: "SolutionsIO Logo", dataAiHint:"company logo tech" },
  { src: "https://placehold.co/130x55.png?text=AlphaEnterprises", alt: "AlphaEnterprises Logo", dataAiHint:"company logo business" },
  { src: "https://placehold.co/100x60.png?text=SynergySys", alt: "SynergySys Logo", dataAiHint:"company logo modern" },
  { src: "https://placehold.co/125x50.png?text=NextGenLLC", alt: "NextGenLLC Logo", dataAiHint:"company logo finance" },
];

export function TestimonialsSection() {
  return (
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
            {companyLogos.map((logo, i) => (
              <Image key={i} src={logo.src} alt={logo.alt} width={parseInt(logo.src.match(/(\d+)x(\d+)/)?.[1] || '120')} height={parseInt(logo.src.match(/(\d+)x(\d+)/)?.[2] || '60')} className="opacity-70 hover:opacity-100 transition-opacity" data-ai-hint={logo.dataAiHint} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
