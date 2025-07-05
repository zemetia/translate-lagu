import { TranslationClient } from '@/components/translation-client';
import { Music4 } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="py-4 border-b shadow-sm bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4">
          <Music4 className="text-primary" size={32} />
          <h1 className="text-3xl font-headline font-bold text-foreground">
            Translate Lagu
          </h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        <TranslationClient />
      </main>

      <footer className="p-4 mt-8 border-t text-center text-sm text-muted-foreground">
        <p>Translate song lyrics between English and Indonesian with AI.</p>
        <p>Crafted by Firebase Studio.</p>
      </footer>
    </div>
  );
}
