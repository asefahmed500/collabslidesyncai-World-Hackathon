
import Link from 'next/link';
import { Separator } from "@/components/ui/separator";
import { Zap, MessageCircle, Info, Code } from 'lucide-react';

export function LandingFooter() {
  return (
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
  );
}
