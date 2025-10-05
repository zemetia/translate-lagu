"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import {
  handleSearch,
  handleTranslation,
  handleRefinement,
  handleUrlExtraction,
  handleGetLyrics,
  handleCleanLyrics,
} from "@/app/actions";
import { logUserAction } from "@/lib/log-user-action";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
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
  const [isCleaning, startCleaning] = useTransition();

  const { toast } = useToast();
  const { user } = useAuth();

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
      // Log song selection
      if (user?.uid) {
        await logUserAction(user.uid, "select_song", {
          songTitle: song.songTitle,
          artist: song.artist,
        });
      }

      const result = await handleGetLyrics({
        songTitle: song.songTitle,
        artist: song.artist,
        uid: user?.uid || '',
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

  const onCleanUpLyrics = async () => {
    if (!lyrics || lyrics.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "No lyrics to clean",
        description: "Please load or enter some lyrics first.",
      });
      return;
    }

    startCleaning(async () => {
      const result = await handleCleanLyrics({
        lyrics,
        uid: user?.uid || ''
      });

      if (result.error) {
        toast({
          variant: "destructive",
          title: "Cleanup Failed",
          description: result.error,
        });
      } else if (result.data) {
        const cleaned = result.data.cleanedLyrics;

        if (lyrics.trim() !== cleaned.trim()) {
          setLyrics(cleaned);
          if (selectedSong) {
            setLyricsEdited(true);
          }
          toast({
            title: "Lyrics Cleaned",
            description: "Removed section markers, chords, and duplicate sections.",
          });
        } else {
          toast({
            title: "No changes needed",
            description: "The lyrics are already clean.",
          });
        }
      }
    });
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
      const result = await handleTranslation({ lyrics, uid: user?.uid || '' });

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
        uid: user?.uid || '',
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

  const handleCopy = async () => {
    if (!translation) return;

    // Log copy all action
    if (user?.uid) {
      await logUserAction(user.uid, "copy_all");
    }

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

    const handleCopyBlock = async (e: React.MouseEvent) => {
      e.stopPropagation();

      // Log copy block action
      if (user?.uid) {
        await logUserAction(user.uid, "copy_block");
      }

      navigator.clipboard.writeText(text).then(() => {
        toast({ title: "Block copied to clipboard!" });
      });
    };

    return (
      <div
        className="relative p-4 rounded-lg cursor-pointer bg-card/50 hover:bg-card border-2 border-transparent hover:border-primary/30 transition-all duration-300 hover:shadow-md group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCopyBlock}
      >
        {isHovered && (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground p-1.5 rounded-md shadow-lg z-10 animate-scale-in">
            <Copy className="h-3.5 w-3.5" />
          </div>
        )}
        <div className="whitespace-pre-wrap leading-relaxed">{renderBlockContent(text)}</div>
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
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
        {/* INPUT COLUMN */}
        <div className="space-y-6 animate-slide-up">
          <Card className="card-hover border-2 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                Get Lyrics
              </CardTitle>
              <CardDescription className="text-base">
                Search for a song by title or import it from a URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
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
                    <input type="hidden" name="uid" value={user?.uid || ''} />
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
                    <input type="hidden" name="uid" value={user?.uid || ''} />
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
            <Card className="border-2 border-primary/20 bg-primary/5 animate-pulse-glow">
              <CardContent className="text-center p-8 flex flex-col items-center justify-center gap-3">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                <span className="text-muted-foreground font-medium">
                  {isExtracting
                    ? "Extracting from URL..."
                    : "Searching for songs..."}
                </span>
              </CardContent>
            </Card>
          )}

          {isFetchingLyrics && (
            <Card className="border-2 border-primary/20 bg-primary/5 animate-pulse-glow">
              <CardContent className="text-center p-8 flex flex-col items-center justify-center gap-3">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                <span className="text-muted-foreground font-medium">Fetching lyrics for your selection...</span>
              </CardContent>
            </Card>
          )}

          {searchResults && searchResults.length > 0 && (
            <Card className="card-hover border-2 shadow-lg animate-scale-in">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
                <CardTitle className="font-headline text-xl">Search Results</CardTitle>
                <CardDescription>Select a song to continue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pt-6">
                {searchResults.map((song, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start h-auto p-4 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02]"
                    onClick={() => onSelectSong(song)}
                  >
                    <div className="mr-4 bg-primary/10 p-2 rounded-lg">
                      <ListMusic className="text-primary h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-base">{song.songTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {song.artist}
                      </p>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="card-hover border-2 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                Edit Lyrics & Translate
              </CardTitle>
              {selectedSong ? (
                <div className="flex items-center justify-between pt-3 text-sm bg-card p-3 rounded-lg mt-2 border">
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
                <CardDescription className="text-base mt-2">
                  Paste lyrics here, or get them via search/URL.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
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
              <div className="flex justify-end items-center pt-2 gap-3">
                <Button
                  onClick={onCleanUpLyrics}
                  disabled={isTranslating || isCleaning || !lyrics}
                  variant="outline"
                  className="hover:bg-accent/10 hover:border-accent transition-all"
                >
                  {isCleaning ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  <span className="ml-2">{isCleaning ? "Cleaning..." : "Clean Up"}</span>
                </Button>
                <Button
                  onClick={onTranslate}
                  disabled={isTranslating || !lyrics}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  {isTranslating ? (
                    <LoaderCircle className="animate-spin h-5 w-5" />
                  ) : (
                    <Languages className="h-5 w-5" />
                  )}
                  <span className="ml-2 font-semibold">Translate Lyrics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OUTPUT COLUMN */}
        <div className="space-y-6 animate-slide-up [animation-delay:200ms]">
          {isTranslating && (
            <Card className="border-2 border-primary/20 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                  <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                  Review and Refine
                </CardTitle>
                <CardDescription className="text-base">Translating your lyrics...</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-16 space-y-4">
                <div className="relative">
                  <LoaderCircle className="h-16 w-16 animate-spin text-primary" />
                  <div className="absolute inset-0 h-16 w-16 rounded-full bg-primary/20 animate-ping" />
                </div>
                <p className="text-muted-foreground font-medium">Processing with AI...</p>
              </CardContent>
            </Card>
          )}

          {translation && !isTranslating && (
            <Card className="sticky top-8 card-hover border-2 shadow-xl animate-scale-in">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
                <div className="flex justify-between items-center">
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                    Review and Refine
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="hover:bg-primary/10 hover:border-primary transition-all"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="ml-2">Copy All</span>
                  </Button>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <CardDescription className="text-sm">
                    Translation in <span className="text-primary font-semibold">purple</span>. Click any block to copy.
                  </CardDescription>
                  <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary">
                    Style: {translation.translationStyle}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="font-body text-base leading-relaxed bg-gradient-to-br from-muted/50 to-muted p-4 rounded-lg border-2 h-96 overflow-y-auto space-y-3 shadow-inner">
                  {translation.translated
                    .split(/\n\s*\n/)
                    .filter((b) => b.trim())
                    .map((block, index) => (
                      <LyricsBlock key={index} text={block.trim()} />
                    ))}
                </div>
              </CardContent>
              <div className="p-4 border-t bg-gradient-to-r from-accent/5 to-primary/5 m-2 rounded-lg border">
                <Label
                  htmlFor="refine"
                  className="font-bold flex items-center gap-2 mb-3 text-base"
                >
                  <Sparkles className="h-5 w-5 text-accent" />
                  Refine with AI
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="refine"
                    placeholder="e.g., Make it more formal..."
                    value={refinementPrompt}
                    onChange={(e) => setRefinementPrompt(e.target.value)}
                    disabled={isRefining}
                    className="border-2 focus:border-accent"
                  />
                  <Button
                    onClick={onRefine}
                    disabled={isRefining || !refinementPrompt}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    {isRefining ? (
                      <LoaderCircle className="animate-spin h-5 w-5" />
                    ) : (
                      <ArrowRight className="h-5 w-5" />
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
