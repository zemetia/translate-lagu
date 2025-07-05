"use client";

import { useState, useTransition } from "react";
import { handleSearch, handleTranslation, handleRefinement } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  LoaderCircle,
  Languages,
  Sparkles,
  ArrowRight,
  Search,
  ListMusic,
  RefreshCcw,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SearchResult {
  songTitle: string;
  artist: string;
  lyrics: string;
}

interface TranslationResult {
  original: string;
  artist: string;
  songTitle: string;
  detectedLanguage: "en" | "id";
  translated: string;
}

export function TranslationClient() {
  const [lyrics, setLyrics] = useState("");
  const [refinementPrompt, setRefinementPrompt] = useState("");
  
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [selectedSong, setSelectedSong] = useState<SearchResult | null>(null);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  
  const [isSearching, startSearch] = useTransition();
  const [isTranslating, startTranslation] = useTransition();
  const [isRefining, startRefinement] = useTransition();
  
  const { toast } = useToast();

  const onSearch = (formData: FormData) => {
    const query = formData.get("query") as string;
    if (query.trim().length < 3) {
      toast({
        variant: "destructive",
        title: "Search query too short",
        description: "Please enter at least 3 characters to search.",
      });
      return;
    }

    startSearch(async () => {
      const result = await handleSearch(formData);
      if (result.error) {
        toast({ variant: "destructive", title: "Search Failed", description: result.error });
        setSearchResults([]);
      } else {
        setSearchResults(result.data?.results || []);
        if (!result.data?.results || result.data.results.length === 0) {
            toast({ title: "No results found", description: "Try a different song title or artist." });
        }
      }
    });
  };

  const onSelectSong = (song: SearchResult) => {
    setSelectedSong(song);
    setLyrics(song.lyrics);
    setSearchResults(null);
    setTranslation(null);
  };

  const onTranslate = async () => {
    if (lyrics.trim().length < 10) {
      toast({
        variant: "destructive",
        title: "Input too short",
        description: "Please enter more lyrics to translate.",
      });
      return;
    }

    setTranslation(null);
    startTranslation(async () => {
      const result = await handleTranslation({ lyrics });

      if (result.error) {
        toast({ variant: "destructive", title: "Translation Failed", description: result.error });
        setTranslation(null);
      } else if (result.data && selectedSong) {
        setTranslation({
          original: result.data.originalLyrics,
          artist: selectedSong.artist,
          songTitle: selectedSong.songTitle,
          detectedLanguage: result.data.detectedLanguage,
          translated: result.data.translatedLyrics,
        });
        setRefinementPrompt("");
      }
    });
  };

  const onRefine = async () => {
    if (!translation) return;

    startRefinement(async () => {
      const result = await handleRefinement({
        originalText: translation.original,
        initialTranslation: translation.translated,
        refinementPrompt,
      });

      if (result.error) {
        toast({ variant: "destructive", title: "Refinement Failed", description: result.error });
      } else if (result.data) {
        setTranslation({ ...translation, translated: result.data.refinedTranslation });
        toast({ title: "Translation Refined" });
      }
    });
  };
  
  const handleReset = () => {
    setSearchResults(null);
    setSelectedSong(null);
    setLyrics("");
    setTranslation(null);
  };

  const languageName = (code: 'en' | 'id' | undefined) => {
    if (code === 'en') return 'English';
    if (code === 'id') return 'Indonesian';
    return 'Unknown';
  };
  
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {!selectedSong ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Search for a Song</CardTitle>
            <CardDescription>Enter a song title or artist to find lyrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={onSearch} className="flex items-center gap-2">
              <Input
                name="query"
                placeholder="e.g., Amazing Grace, Hillsong, etc."
                className="flex-grow"
                disabled={isSearching}
                aria-label="Song search query"
              />
              <Button type="submit" disabled={isSearching} size="lg">
                {isSearching ? <LoaderCircle className="animate-spin" /> : <Search />}
                <span className="ml-2">Search</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
             <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="font-headline text-2xl">Edit Lyrics & Translate</CardTitle>
                        <CardDescription>Review the lyrics for &quot;{selectedSong.songTitle}&quot; and translate when ready.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RefreshCcw />
                        <span className="ml-2">Start Over</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Textarea
                    id="lyrics"
                    placeholder="Paste song lyrics here..."
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    className="h-64 resize-y font-mono"
                    aria-label="Song lyrics input"
                  />
                  <div className="flex justify-end pt-2">
                    <Button onClick={onTranslate} disabled={isTranslating} size="lg">
                      {isTranslating ? <LoaderCircle className="animate-spin" /> : <Languages />}
                      <span className="ml-2">Translate Lyrics</span>
                    </Button>
                  </div>
            </CardContent>
        </Card>
      )}

      {isSearching && (
         <div className="text-center p-8 space-y-4">
            <LoaderCircle className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Searching for songs...</p>
        </div>
      )}

      {searchResults && searchResults.length > 0 && (
         <Card>
            <CardHeader>
                <CardTitle className="font-headline">Search Results</CardTitle>
                <CardDescription>Select a song to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {searchResults.map((song, index) => (
                    <Button key={index} variant="outline" className="w-full justify-start h-auto p-4" onClick={() => onSelectSong(song)}>
                        <ListMusic className="text-primary mr-4"/>
                        <div className="text-left">
                            <p className="font-bold">{song.songTitle}</p>
                            <p className="text-sm text-muted-foreground">{song.artist}</p>
                        </div>
                    </Button>
                ))}
            </CardContent>
         </Card>
      )}

      {(isTranslating || translation) && <Separator className="my-8" />}

      {isTranslating && (
        <div className="grid md:grid-cols-2 gap-8">
            <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
        </div>
      )}

      {translation && !isTranslating && (
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in duration-500">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                Original: {translation.songTitle}
                <span className="text-sm font-normal text-muted-foreground font-body">({languageName(translation.detectedLanguage)})</span>
              </CardTitle>
              <CardDescription>By {translation.artist}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-body text-sm leading-relaxed">{translation.original}</pre>
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                Translated Lyrics
                <span className="text-sm font-normal text-muted-foreground font-body">({languageName(translation.detectedLanguage === 'en' ? 'id' : 'en')})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <pre className="whitespace-pre-wrap font-body text-sm leading-relaxed">{translation.translated}</pre>
            </CardContent>
             <div className="p-4 border-t bg-secondary/50 m-2 rounded-lg">
                <Label htmlFor="refine" className="font-bold flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-accent-foreground" style={{color: 'hsl(var(--accent))'}}/> 
                    Refine with AI
                </Label>
                 <div className="flex gap-2">
                    <Input
                        id="refine"
                        placeholder="e.g., Make it more formal, use simpler words..."
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        disabled={isRefining}
                        aria-label="Refinement prompt"
                    />
                    <Button onClick={onRefine} disabled={isRefining || !refinementPrompt} variant="default" style={{backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))'}}>
                        {isRefining ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
                        <span className="sr-only">Refine</span>
                    </Button>
                 </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Skeleton({ className }: { className: string }) {
    return <div className={`animate-pulse bg-muted rounded-md ${className}`} />;
}
