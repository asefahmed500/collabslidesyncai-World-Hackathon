
import { Users, Edit3, TrendingUp, Youtube, UserPlus } from 'lucide-react';

const howItWorksSteps = [
  { title: "Sign Up Free", description: "Create your account in seconds.", icon: <UserPlus className="h-8 w-8 text-primary"/> },
  { title: "Create Team", description: "Set up your team or join an existing one.", icon: <Users className="h-8 w-8 text-primary"/> },
  { title: "Build Slides", description: "Use our intuitive editor and AI tools.", icon: <Edit3 className="h-8 w-8 text-primary"/> },
  { title: "Collaborate", description: "Work together in real-time with your team.", icon: <TrendingUp className="h-8 w-8 text-primary"/> },
  { title: "Share & Present", description: "Deliver impactful presentations online or offline.", icon: <Youtube className="h-8 w-8 text-primary"/> },
];

export function HowItWorksSection() {
  return (
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
  );
}
