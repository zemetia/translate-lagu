import { TranslationClient } from '@/components/translation-client';
import { UserMenu } from '@/components/user-menu';
import { Music4, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background gradient-bg relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <header className="relative py-8 border-b border-border/50 bg-card/80 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Music4 className="text-primary animate-float" size={48} />
                <Sparkles className="absolute -top-1 -right-1 text-accent" size={20} />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-bold gradient-text">
                Translate Lagu
              </h1>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8 relative z-10 animate-fade-in">
        <TranslationClient />
      </main>

      <footer className="relative p-6 mt-12 border-t border-border/50 bg-card/50 backdrop-blur-sm text-center text-sm text-muted-foreground">
        <p className="font-medium">Translate song lyrics between English and Indonesian with AI.</p>
        <p className="mt-1 text-xs">Crafted with ♥ by Firebase Studio</p>
      </footer>
    </div>
  );
}
