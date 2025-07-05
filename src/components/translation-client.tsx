"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { handleSearch, handleTranslation, handleRefinement } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  LoaderCircle,
  Languages,
  Sparkles,
  ArrowRight,
  Search,
  ListMusic,
  Copy,
  X,
} from "lucide-react";

interface SearchResult {
  songTitle: string;
  artist: string;
  lyrics: string;
}

interface TranslationResult {
  original: string;
  translationStyle: string;
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
    setLyrics(song.lyrics);
    setSelectedSong(song);
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
      } else if (result.data) {
        setTranslation({
          original: result.data.originalLyrics,
          translationStyle: result.data.translationStyle,
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
  
  const handleCopy = () => {
    if (!translation) return;
    navigator.clipboard.writeText(translation.translated).then(() => {
        toast({ title: "Formatted lyrics copied to clipboard!" });
    });
  };

  const renderTranslation = (text: string) => {
    const parts = text.split(/(\{tl\}[\s\S]*?\{\/tl\})/g);

    return parts.map((part, index) => {
      const match = part.match(/\{tl\}([\s\S]*?)\{\/tl\}/);
      if (match) {
        return (
          <span key={index} className="text-primary">
            {match[1]}
          </span>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  const clearSelectedSong = () => {
    setLyrics("");
    setSelectedSong(null);
    setTranslation(null);
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* INPUT COLUMN */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">1. Find a song (Optional)</CardTitle>
              <CardDescription>Search for a song by title, artist, or lyrics.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={onSearch} className="flex items-center gap-2">
                <Input
                  name="query"
                  placeholder="e.g., Amazing Grace"
                  className="flex-grow"
                  disabled={isSearching}
                />
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? <LoaderCircle className="animate-spin" /> : <Search />}
                  <span className="ml-2">Search</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {isSearching && (
            <div className="text-center p-4">
              <LoaderCircle className="h-6 w-6 animate-spin mx-auto text-primary" />
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

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">2. Enter or Edit Lyrics</CardTitle>
              {selectedSong ? (
                <div className="flex items-center justify-between pt-2 text-sm">
                    <div>
                        <p className="font-bold">{selectedSong.songTitle}</p>
                        <p className="text-muted-foreground">{selectedSong.artist}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={clearSelectedSong} className="h-8 w-8">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear song and lyrics</span>
                    </Button>
                </div>
              ) : (
                <CardDescription>Paste lyrics here, or start with a search.</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                  placeholder="[Verse 1]
Amazing grace, how sweet the sound..."
                  value={lyrics}
                  onChange={(e) => {
                    setLyrics(e.target.value);
                    if(selectedSong) setSelectedSong(null);
                  }}
                  className="h-64 resize-y font-mono"
                  aria-label="Song lyrics input"
                />
                <div className="flex justify-end pt-2">
                  <Button onClick={onTranslate} disabled={isTranslating || !lyrics} size="lg">
                    {isTranslating ? <LoaderCircle className="animate-spin" /> : <Languages />}
                    <span className="ml-2">Translate Lyrics</span>
                  </Button>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* OUTPUT COLUMN */}
        <div className="space-y-6">
          {isTranslating && (
             <Card>
                <CardHeader>
                  <CardTitle className="font-headline">3. Review and Refine</CardTitle>
                  <CardDescription>Translating...</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-16">
                  <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                </CardContent>
            </Card>
          )}

          {translation && !isTranslating && (
            <Card className="sticky top-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="font-headline">3. Review and Refine</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                        <Copy />
                        <span className="ml-2">Copy Formatted</span>
                    </Button>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <CardDescription>The translation is in blue. Use the refinement box below if needed.</CardDescription>
                  <Badge variant="outline">Style: {translation.translationStyle}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap font-body text-sm leading-relaxed bg-muted p-4 rounded-md h-96 overflow-y-auto">
                    {renderTranslation(translation.translated)}
                </pre>
              </CardContent>
              <div className="p-4 border-t bg-secondary/50 m-2 rounded-lg">
                  <Label htmlFor="refine" className="font-bold flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-accent-foreground" style={{color: 'hsl(var(--accent))'}}/> 
                      Refine with AI
                  </Label>
                  <div className="flex gap-2">
                      <Input
                          id="refine"
                          placeholder="e.g., Make it more formal..."
                          value={refinementPrompt}
                          onChange={(e) => setRefinementPrompt(e.target.value)}
                          disabled={isRefining}
                      />
                      <Button onClick={onRefine} disabled={isRefining || !refinementPrompt} variant="default" style={{backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))'}}>
                          {isRefining ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
                          <span className="sr-only">Refine</span>
                      </Button>
                  </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}