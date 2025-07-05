"use client";

import { useState, useTransition } from "react";
import { handleTranslation, handleRefinement } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  LoaderCircle,
  Languages,
  BookOpen,
  Feather,
  Sparkles,
  ArrowRight,
  Search
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type TranslationMode = "poetic" | "literal";

interface TranslationResult {
  original: string; // The original lyrics from either input or search
  artist: string;
  detectedLanguage: "en" | "id";
  translated: string;
}

export function TranslationClient() {
  const [lyrics, setLyrics] = useState("");
  const [artist, setArtist] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [searchArtist, setSearchArtist] = useState("");
  const [activeTab, setActiveTab] = useState("lyrics");

  const [mode, setMode] = useState<TranslationMode>("poetic");
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  
  const [isTranslating, startTranslation] = useTransition();
  const [isRefining, startRefinement] = useTransition();
  
  const { toast } = useToast();
  
  const isSearchMode = activeTab === "search";

  const onTranslate = async () => {
    if (isSearchMode && songTitle.trim().length < 3) {
      toast({
        variant: "destructive",
        title: "Input too short",
        description: "Please enter a song title to search.",
      });
      return;
    }
    if (!isSearchMode && lyrics.trim().length < 10) {
      toast({
        variant: "destructive",
        title: "Input too short",
        description: "Please enter more lyrics to translate.",
      });
      return;
    }

    setTranslation(null); // Clear previous results
    startTranslation(async () => {
      const result = await handleTranslation(
        isSearchMode
          ? { songTitle, artist: searchArtist, translationMode: mode }
          : { lyrics, translationMode: mode }
      );

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Translation Failed",
          description: result.error,
        });
        setTranslation(null);
      } else if (result.data) {
        // After a successful search, populate the lyrics textarea
        if (isSearchMode && result.data.originalLyrics) {
          setLyrics(result.data.originalLyrics);
        }
        
        setTranslation({
          original: result.data.originalLyrics, // Use the definitive original lyrics from the backend
          artist: isSearchMode ? searchArtist : artist, // Use the relevant artist for display
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
        toast({
          variant: "destructive",
          title: "Refinement Failed",
          description: result.error,
        });
      } else if (result.data) {
        setTranslation({
          ...translation,
          translated: result.data.refinedTranslation,
        });
        toast({
            title: "Translation Refined",
            description: "The translation has been updated based on your prompt.",
        });
      }
    });
  };

  const languageName = (code: 'en' | 'id' | undefined) => {
    if (code === 'en') return 'English';
    if (code === 'id') return 'Indonesian';
    return 'Unknown';
  };
  
  return (
    <div className="w-full max-w-6xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Enter or Search Lyrics</CardTitle>
          <CardDescription>
            You can either paste lyrics directly or search for a song by its title.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <Tabs defaultValue="lyrics" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lyrics">Enter Lyrics</TabsTrigger>
              <TabsTrigger value="search">Search Song</TabsTrigger>
            </TabsList>
            <TabsContent value="lyrics" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="lyrics">Lyrics</Label>
                  <Textarea
                    id="lyrics"
                    placeholder="Paste song lyrics here..."
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    className="h-48 resize-none"
                    aria-label="Song lyrics input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist / Composer (Optional)</Label>
                  <Input
                    id="artist"
                    placeholder="e.g., Hillsong, JPCC Worship, etc."
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    aria-label="Artist or composer input"
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="search" className="pt-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="song-title">Song Title</Label>
                    <Input
                      id="song-title"
                      placeholder="e.g., Amazing Grace"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      aria-label="Song title input for search"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="search-artist">Artist (Optional)</Label>
                    <Input
                      id="search-artist"
                      placeholder="e.g., John Newton"
                      value={searchArtist}
                      onChange={(e) => setSearchArtist(e.target.value)}
                      aria-label="Artist input for search"
                    />
                  </div>
               </div>
            </TabsContent>
          </Tabs>
          
          <div className="space-y-3 pt-3">
            <Label>Translation Mode</Label>
            <RadioGroup
              value={mode}
              onValueChange={(value: string) => setMode(value as TranslationMode)}
              className="flex gap-4"
            >
              <Label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md has-[input:checked]:bg-secondary has-[input:checked]:border-primary flex-1 justify-center transition-all">
                <RadioGroupItem value="poetic" id="poetic" />
                <Feather className="h-5 w-5 text-primary" />
                <span>Poetic</span>
              </Label>
              <Label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md has-[input:checked]:bg-secondary has-[input:checked]:border-primary flex-1 justify-center transition-all">
                <RadioGroupItem value="literal" id="literal" />
                <BookOpen className="h-5 w-5 text-primary" />
                <span>Literal</span>
              </Label>
            </RadioGroup>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={onTranslate}
              disabled={isTranslating}
              size="lg"
            >
              {isTranslating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                isSearchMode ? <Search /> : <Languages />
              )}
              <span className="ml-2">{isSearchMode ? 'Search & Translate' : 'Translate Lyrics'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      
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
                Original Lyrics 
                <span className="text-sm font-normal text-muted-foreground font-body">({languageName(translation.detectedLanguage)})</span>
              </CardTitle>
              {translation.artist && (
                 <CardDescription>By {translation.artist}</CardDescription>
              )}
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
                <CardDescription>Mode: {mode.charAt(0).toUpperCase() + mode.slice(1)}</CardDescription>
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
