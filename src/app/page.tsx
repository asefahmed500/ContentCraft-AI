
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import Image from 'next/image';
import { Loader2, Users, LayoutGrid, FlaskConical, Repeat, Share2, Zap, HelpCircle } from 'lucide-react';


function HomePageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
       const destination = session.user?.role === 'admin' ? '/admin/dashboard' : '/creator-dashboard';
       router.replace(destination);
    }
  }, [isAuthenticated, isLoading, router, session]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your workspace...</p>
      </div>
    );
  }

  const features = [
      { title: "Creative War Room", description: "Watch AI agents debate and refine content in real-time.", icon: Users },
      { title: "Multi-Format DNA", description: "One brief transforms into 15+ tailored content pieces.", icon: LayoutGrid },
      { title: "Brand Learning", description: "AI learns your brand voice, style, and values instantly.", icon: FlaskConical },
      { title: "Adversarial Improvement", description: "Content evolves through critique and collaboration.", icon: Repeat },
      { title: "Cross-Platform Intelligence", description: "Optimized content for every channel, automatically.", icon: Share2 },
      { title: "Real-Time Evolution", description: "See your campaign improve live as agents work.", icon: Zap },
  ];


  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo />
          </Link>
          <nav className="flex items-center space-x-2">
            <Button asChild variant="ghost">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up Free</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
          <div className="mx-auto flex max-w-[980px] flex-col items-center gap-6 text-center">
            <h1 className="font-headline text-3xl font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-5xl lg:text-6xl">
              ContentCraft AI: Your
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Multi-Agent </span>
              Creative Powerhouse
            </h1>
            <p className="max-w-[700px] text-lg text-muted-foreground sm:text-xl">
              Revolutionize your content strategy with AI agents that debate, critique, and generate compelling multi-format campaigns. Experience the future of creative collaboration.
            </p>
            <div className="flex gap-4">
              <Button asChild size="lg">
                <Link href="/signup">Get Started Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>
        <section id="features" className="container space-y-6 bg-slate-50/50 dark:bg-slate-800/20 py-8 md:py-12 lg:py-24 rounded-lg shadow-inner">
          <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
            <h2 className="font-headline text-3xl leading-[1.1] sm:text-3xl md:text-4xl">Unique Features</h2>
            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
              Discover what makes ContentCraft AI the most innovative content creation platform.
            </p>
          </div>
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            {features.map((feature) => {
              const LucideIcon = feature.icon || HelpCircle;
              return (
                <div key={feature.title} className="relative overflow-hidden rounded-lg border bg-background p-2 shadow-md hover:shadow-xl transition-shadow duration-300">
                  <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                    <LucideIcon className="h-12 w-12 mb-2 text-primary" />
                    <div className="space-y-2">
                      <h3 className="font-headline font-bold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="container py-8 md:py-12 lg:py-24">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:gap-12">
            <div className="md:w-1/2">
              <Image 
                src="https://placehold.co/600x400.png" 
                alt="ContentCraft AI Dashboard Preview" 
                width={600} 
                height={400}
                className="rounded-lg shadow-2xl"
                data-ai-hint="dashboard interface"
              />
            </div>
            <div className="md:w-1/2">
              <h2 className="font-headline text-3xl leading-tight sm:text-3xl md:text-4xl mb-4">
                Visualize the Creative Process
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our intuitive dashboard provides a transparent view into the AI's creative process. Track agent debates, monitor content evolution, and preview multi-format outputs, all in one place.
              </p>
              <Button asChild size="lg">
                <Link href="/signup">Explore the Dashboard</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by ContentCraft AI Team. The future of content is collaborative.
          </p>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} ContentCraft AI</p>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
      <HomePageContent />
  );
}
