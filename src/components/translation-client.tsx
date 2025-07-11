"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import {
  handleSearch,
  handleTranslation,
  handleRefinement,
  handleUrlExtraction,
  handleGetLyrics,
} from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LoaderCircle,
  Languages,
  Sparkles,
  ArrowRight,
  Search,
  ListMusic,
  Copy,
  X,
  Link as LinkIcon,
  Wand2,
} from "lucide-react";
import type { SongCandidate, SongDataWithUrl } from "@/ai/schemas";

interface TranslationResult {
  original: string;
  translationStyle: string;
  translated: string;
}

export function TranslationClient() {
  const [lyrics, setLyrics] = useState("");
  const [refinementPrompt, setRefinementPrompt] = useState("");

  const [searchResults, setSearchResults] = useState<SongCandidate[] | null>(
    null
  );
  const [selectedSong, setSelectedSong] = useState<SongDataWithUrl | null>(null);
  const [translation, setTranslation] = useState<TranslationResult | null>(
    null
  );
  const [lyricsEdited, setLyricsEdited] = useState(false);

  const [isSearching, startSearch] = useTransition();
  const [isFetchingLyrics, startFetchingLyrics] = useTransition();
  const [isExtracting, startUrlExtraction] = useTransition();
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
      clearSelectedSong();
      setSearchResults(null);
      const result = await handleSearch(formData);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Search Failed",
          description: result.error,
        });
        setSearchResults([]);
      } else {
        setSearchResults(result.data?.results || []);
        if (!result.data?.results || result.data.results.length === 0) {
          toast({
            title: "No results found",
            description: "Try a different song title or artist.",
          });
        }
      }
    });
  };

  const onUrlExtract = (formData: FormData) => {
    const url = formData.get("url") as string;
    if (!url || !url.startsWith("http")) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http or https.",
      });
      return;
    }

    startUrlExtraction(async () => {
      clearSelectedSong();
      setSearchResults(null);
      const result = await handleUrlExtraction(formData);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Extraction Failed",
          description: result.error,
        });
      } else if (result.data) {
        const songData = {
          songTitle: result.data.songTitle,
          artist: result.data.artist,
          lyrics: result.data.lyrics,
          sourceUrl: result.data.sourceUrl,
        };
        setSelectedSong(songData);
        setLyrics(songData.lyrics);
        setLyricsEdited(false);
        setTranslation(null);
        toast({ title: "Successfully extracted song!" });
      }
    });
  };

  const onSelectSong = (song: SongCandidate) => {
    setSearchResults(null);
    startFetchingLyrics(async () => {
      const result = await handleGetLyrics({
        songTitle: song.songTitle,
        artist: song.artist,
      });

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Failed to Get Lyrics",
          description: result.error,
        });
      } else if (result.data) {
        const songData = {
          songTitle: result.data.songTitle,
          artist: result.data.artist,
          lyrics: result.data.lyrics,
          sourceUrl: result.data.sourceUrl,
        };
        setSelectedSong(songData);
        setLyrics(songData.lyrics);
        setTranslation(null);
        setLyricsEdited(false);
        toast({ title: "Successfully fetched lyrics!" });
      }
    });
  };

  const onCleanUpLyrics = () => {
    const cleanup = (text: string): string => {
      const withoutMarkers = text.replace(/^\s*\[.*?\]\s*$/gm, "");
      const blocks = withoutMarkers
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter((block) => block.length > 0);
      const uniqueBlocks: string[] = [];
      const seen = new Set<string>();
      for (const block of blocks) {
        if (!seen.has(block)) {
          uniqueBlocks.push(block);
          seen.add(block);
        }
      }
      return uniqueBlocks.join("\n\n");
    };

    const cleaned = cleanup(lyrics);
    if (lyrics.trim() !== cleaned.trim()) {
      setLyrics(cleaned);
      if (selectedSong) {
        setLyricsEdited(true);
      }
      toast({
        title: "Lyrics Cleaned",
        description: "Removed markers and duplicate sections.",
      });
    } else {
      toast({
        title: "No changes needed",
        description: "The lyrics are already clean.",
      });
    }
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
        toast({
          variant: "destructive",
          title: "Translation Failed",
          description: result.error,
        });
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
        toast({ title: "Translation Refined" });
      }
    });
  };

  const handleCopy = () => {
    if (!translation) return;
    navigator.clipboard.writeText(translation.translated).then(() => {
      toast({ title: "Copied all lyrics to clipboard!" });
    });
  };
  
  const renderBlockContent = (text: string) => {
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

  const LyricsBlock = ({ text }: { text: string }) => {
    const [isHovered, setIsHovered] = useState(false);

    const handleCopyBlock = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: "Block copied to clipboard!" });
      });
    };

    return (
      <div
        className="relative p-2 rounded-md cursor-pointer hover:bg-background/80 dark:hover:bg-background/50 transition-colors"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCopyBlock}
      >
        {isHovered && (
          <Copy className="absolute top-2 right-2 h-4 w-4 text-muted-foreground z-10" />
        )}
        <div className="whitespace-pre-wrap">{renderBlockContent(text)}</div>
      </div>
    );
  };


  const clearSelectedSong = () => {
    setLyrics("");
    setSelectedSong(null);
    setTranslation(null);
    setLyricsEdited(false);
  };

  const isLoading = isSearching || isExtracting;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* INPUT COLUMN */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">1. Get Lyrics</CardTitle>
              <CardDescription>
                Search for a song by title or import it from a URL.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="search" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="search" disabled={isLoading}>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </TabsTrigger>
                  <TabsTrigger value="url" disabled={isLoading}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    From URL
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="search" className="pt-4">
                  <form action={onSearch} className="flex items-center gap-2">
                    <Input
                      name="query"
                      placeholder="e.g., Amazing Grace"
                      className="flex-grow"
                      disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading}>
                      {isSearching ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Search />
                      )}
                      <span className="ml-2">Search</span>
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="url" className="pt-4">
                  <form
                    action={onUrlExtract}
                    className="flex items-center gap-2"
                  >
                    <Input
                      name="url"
                      placeholder="https://... paste song page URL"
                      className="flex-grow"
                      disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading}>
                      {isExtracting ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <ArrowRight />
                      )}
                      <span className="ml-2">Extract</span>
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {isLoading && (
            <div className="text-center p-4 flex items-center justify-center gap-2 text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <span>
                {isExtracting
                  ? "Extracting from URL..."
                  : "Searching for songs..."}
              </span>
            </div>
          )}
          
          {isFetchingLyrics && (
             <div className="text-center p-4 flex items-center justify-center gap-2 text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <span>Fetching lyrics for your selection...</span>
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
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={() => onSelectSong(song)}
                  >
                    <ListMusic className="text-primary mr-4" />
                    <div className="text-left">
                      <p className="font-bold">{song.songTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {song.artist}
                      </p>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">
                2. Edit Lyrics & Translate
              </CardTitle>
              {selectedSong ? (
                <div className="flex items-center justify-between pt-2 text-sm">
                  <div className="overflow-hidden">
                    <p className="font-bold truncate">{selectedSong.songTitle}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground truncate">
                        {selectedSong.artist}
                      </p>
                      {lyricsEdited && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs whitespace-nowrap">
                          Edited
                        </Badge>
                      )}
                    </div>
                    {selectedSong.sourceUrl && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                            Source:{" "}
                            <a
                                href={selectedSong.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-primary"
                                title={selectedSong.sourceUrl}
                            >
                                {new URL(selectedSong.sourceUrl).hostname}
                            </a>
                        </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSelectedSong}
                    className="h-8 w-8 flex-shrink-0 ml-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Clear song and lyrics</span>
                  </Button>
                </div>
              ) : (
                <CardDescription>
                  Paste lyrics here, or get them via search/URL.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="[Verse 1]
Amazing grace, how sweet the sound..."
                value={lyrics}
                onChange={(e) => {
                  setLyrics(e.target.value);
                  if (selectedSong) {
                    setLyricsEdited(true);
                  }
                }}
                className="h-64 resize-y font-mono"
                aria-label="Song lyrics input"
              />
              <div className="flex justify-end items-center pt-2 gap-2">
                <Button
                  onClick={onCleanUpLyrics}
                  disabled={isTranslating || !lyrics}
                  variant="outline"
                >
                  <Wand2 />
                  <span className="ml-2">Clean Up</span>
                </Button>
                <Button
                  onClick={onTranslate}
                  disabled={isTranslating || !lyrics}
                  size="lg"
                >
                  {isTranslating ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Languages />
                  )}
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
                <CardTitle className="font-headline">
                  3. Review and Refine
                </CardTitle>
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
                  <CardTitle className="font-headline">
                    3. Review and Refine
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy />
                    <span className="ml-2">Copy All</span>
                  </Button>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <CardDescription>
                    The translation is in blue. Click any block to copy it.
                  </CardDescription>
                  <Badge variant="outline">
                    Style: {translation.translationStyle}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="font-body text-sm leading-relaxed bg-muted p-2 rounded-md h-96 overflow-y-auto space-y-2">
                  {translation.translated
                    .split(/\n\s*\n/)
                    .filter((b) => b.trim())
                    .map((block, index) => (
                      <LyricsBlock key={index} text={block.trim()} />
                    ))}
                </div>
              </CardContent>
              <div className="p-4 border-t bg-secondary/50 m-2 rounded-lg">
                <Label
                  htmlFor="refine"
                  className="font-bold flex items-center gap-2 mb-2"
                >
                  <Sparkles
                    className="h-5 w-5 text-accent-foreground"
                    style={{ color: "hsl(var(--accent))" }}
                  />
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
                  <Button
                    onClick={onRefine}
                    disabled={isRefining || !refinementPrompt}
                    variant="default"
                    style={{
                      backgroundColor: "hsl(var(--accent))",
                      color: "hsl(var(--accent-foreground))",
                    }}
                  >
                    {isRefining ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <ArrowRight />
                    )}
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
