"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { get } from "@/lib/action";
import { cn } from "@/lib/utils";
import {
  Keyboard,
  RefreshCw,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Word {
  id: string;
  word: string;
  difficulty: number;
  length: number;
}

interface TypedWord {
  word: string;
  isCorrect: boolean;
}

export function TypingTest() {
  const [words, setWords] = useState<Word[]>([]);
  const [wordsFetchFailed, setWordsFetchFailed] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [typedWords, setTypedWords] = useState<TypedWord[]>([]);
  const [correctWords, setCorrectWords] = useState(0);
  const [incorrectWords, setIncorrectWords] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [typedChars, setTypedChars] = useState(0);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lines, setLines] = useState<number[][]>([]); // Array of arrays containing word indices per line
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch from browser extensions like Dark Reader
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate lines based on word widths
  useEffect(() => {
    if (!wordsContainerRef.current || words.length === 0) return;

    const calculateLines = () => {
      const container = wordsContainerRef.current;
      if (!container) return;

      const containerStyles = getComputedStyle(container);
      const paddingLeft = parseFloat(containerStyles.paddingLeft || "0");
      const paddingRight = parseFloat(containerStyles.paddingRight || "0");
      const containerWidth = container.clientWidth - paddingLeft - paddingRight;
      if (containerWidth <= 0) return;

      const lineProbe = document.createElement("div");
      lineProbe.className =
        "flex flex-nowrap gap-x-3 text-2xl md:text-3xl leading-relaxed font-mono";
      lineProbe.style.cssText =
        "position: absolute; visibility: hidden; pointer-events: none;";

      const wordProbe = document.createElement("span");
      wordProbe.style.whiteSpace = "pre";
      lineProbe.appendChild(wordProbe);
      container.appendChild(lineProbe);

      const lineStyles = getComputedStyle(lineProbe);
      const spaceWidth = parseFloat(
        lineStyles.columnGap || lineStyles.gap || "0",
      );

      const newLines: number[][] = [];
      let currentLine: number[] = [];
      let currentWidth = 0;
      const safetyBuffer = 2;

      for (let i = 0; i < words.length; i++) {
        wordProbe.textContent = words[i].word;
        const wordWidth = wordProbe.getBoundingClientRect().width;
        const projectedWidth =
          currentWidth + wordWidth + (currentLine.length > 0 ? spaceWidth : 0);

        if (
          projectedWidth > containerWidth - safetyBuffer &&
          currentLine.length > 0
        ) {
          // Start a new line when we exceed container width
          newLines.push([...currentLine]);
          currentLine = [i];
          currentWidth = wordWidth;
        } else {
          currentLine.push(i);
          currentWidth += wordWidth + (currentLine.length > 1 ? spaceWidth : 0);
        }
      }

      if (currentLine.length > 0) {
        newLines.push(currentLine);
      }

      container.removeChild(lineProbe);
      setLines(newLines);
    };

    calculateLines();
    window.addEventListener("resize", calculateLines);
    return () => window.removeEventListener("resize", calculateLines);
  }, [words]);

  const fetchWords = useCallback(async () => {
    setIsLoading(true);
    setWordsFetchFailed(false);
    try {
      const difficultyParam = difficulty ? `&difficulty=${difficulty}` : "";
      const response = await get(
        `typing/words/random?limit=200${difficultyParam}`,
      );
      if (response.success && Array.isArray(response.words) && response.words.length > 0) {
        setWords(response.words);
        setWordsFetchFailed(false);
      } else {
        setWords([]);
        setWordsFetchFailed(true);
      }
    } catch (error) {
      console.error("Error fetching words:", error);
      setWords([]);
      setWordsFetchFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [difficulty]);

  // Fetch words on mount and when difficulty changes
  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            setIsActive(false);
            setIsFinished(true);
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const resetTest = () => {
    setIsActive(false);
    setIsFinished(false);
    setTimeLeft(60);
    setCurrentWordIndex(0);
    setCurrentInput("");
    setCorrectWords(0);
    setIncorrectWords(0);
    setTypedChars(0);
    setTypedWords([]);
    setCurrentLineIndex(0);
    fetchWords();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (isFinished) return;

    // Start timer on first character typed
    if (!isActive && value.length === 1) {
      setIsActive(true);
    }

    if (!isActive && value.length === 0) return;

    if (value.endsWith(" ")) {
      const typedWord = value.trim();
      const currentWord = words[currentWordIndex]?.word;
      if (!currentWord) return;
      const isCorrect = typedWord === currentWord;

      setTypedChars((prev) => prev + typedWord.length + 1);

      // Add to typed words history
      setTypedWords((prev) => [...prev, { word: currentWord, isCorrect }]);

      if (isCorrect) {
        setCorrectWords((prev) => prev + 1);
      } else {
        setIncorrectWords((prev) => prev + 1);
      }

      const nextIndex = currentWordIndex + 1;
      setCurrentWordIndex(nextIndex);
      setCurrentInput("");

      // Check if we've finished the current line
      if (lines.length > 0) {
        const currentLine = lines[currentLineIndex];
        if (currentLine && nextIndex > currentLine[currentLine.length - 1]) {
          // Move to next line
          setCurrentLineIndex((prev) => prev + 1);
        }
      }

      // Fetch more words if running low
      if (nextIndex >= words.length - 10) {
        fetchWords();
      }
    } else {
      setCurrentInput(value);
    }
  };

  const wpm = Math.round((correctWords / (60 - timeLeft || 1)) * 60);
  const rawWpm = Math.round((typedChars / 5 / (60 - timeLeft || 1)) * 60);
  const accuracy =
    correctWords + incorrectWords > 0
      ? Math.round((correctWords / (correctWords + incorrectWords)) * 100)
      : 100;

  const getWordClassName = (index: number, word: string) => {
    if (index < currentWordIndex) {
      // Already typed - show as correct (green) or incorrect (red)
      const typedWord = typedWords[index];
      if (typedWord) {
        return typedWord.isCorrect ? "text-green-500" : "text-red-500";
      }
      return "text-muted-foreground";
    } else if (index === currentWordIndex) {
      // Currently typing
      const isTypingCorrect =
        word.startsWith(currentInput) || currentInput === "";
      return cn(
        "relative",
        "after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full",
        isTypingCorrect
          ? "after:bg-foreground text-foreground"
          : "after:bg-destructive text-destructive",
      );
    } else if (index === currentWordIndex + 1) {
      return "opacity-60";
    } else {
      return "opacity-40";
    }
  };

  const getPerformanceRating = () => {
    if (wpm >= 80)
      return { label: "Excellent!", icon: Trophy, color: "text-yellow-500" };
    if (wpm >= 60)
      return { label: "Great!", icon: Zap, color: "text-green-500" };
    if (wpm >= 40)
      return { label: "Good", icon: TrendingUp, color: "text-blue-500" };
    return {
      label: "Keep Practicing",
      icon: Target,
      color: "text-muted-foreground",
    };
  };

  if (isLoading || !mounted) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card className="border-2">
          <CardContent className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              {mounted && (
                <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
              )}
              <div>
                <p className="text-lg font-medium">Loading words...</p>
                <p className="text-sm text-muted-foreground">
                  Preparing your typing test
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleLineGroups =
    lines.length > 0
      ? lines.slice(currentLineIndex, currentLineIndex + 2)
      : [
          words
            .slice(currentWordIndex, currentWordIndex + 8)
            .map((_, idx) => currentWordIndex + idx),
          words
            .slice(currentWordIndex + 8, currentWordIndex + 16)
            .map((_, idx) => currentWordIndex + 8 + idx),
        ].filter((line) => line.length > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Hero Section */}
      {!isActive && !isFinished && (
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Keyboard className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            60 Second Typing Test
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Test your typing speed and accuracy. Click the input field below and
            start typing!
          </p>

          {/* Difficulty Selector */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <span className="text-sm text-muted-foreground">Difficulty:</span>
            <div className="flex gap-2">
              <Button
                variant={difficulty === null ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty(null)}
              >
                All
              </Button>
              <Button
                variant={difficulty === 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty(1)}
              >
                Easy
              </Button>
              <Button
                variant={difficulty === 2 ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty(2)}
              >
                Medium
              </Button>
              <Button
                variant={difficulty === 3 ? "default" : "outline"}
                size="sm"
                onClick={() => setDifficulty(3)}
              >
                Hard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={cn(
            "border-2 transition-all",
            timeLeft <= 10 && isActive && "border-destructive animate-pulse",
          )}
        >
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Time Left
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{timeLeft}s</div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              WPM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary tabular-nums">
              {isActive || isFinished ? wpm : 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">
              {isActive || isFinished ? accuracy : 100}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Words
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">
              {correctWords}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {isActive && (
        <div className="space-y-2">
          <Progress value={((60 - timeLeft) / 60) * 100} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{60 - timeLeft}s elapsed</span>
            <span>{timeLeft}s remaining</span>
          </div>
        </div>
      )}

      {/* Typing Area */}
      <Card className="border-2 shadow-lg">
        <CardContent className="pt-6">
          {!isFinished ? (
            wordsFetchFailed || words.length === 0 ? (
              <div className="py-12 text-center space-y-4">
                <p className="text-xl font-semibold">Something went wrong, try again.</p>
                <p className="text-sm text-muted-foreground">
                  We could not load words for the typing test.
                </p>
                <Button onClick={fetchWords} size="lg" className="text-base px-6">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : (
            <div className="space-y-6">
              {/* Words Display - Two Lines Only */}
              <div
                ref={wordsContainerRef}
                className="relative min-h-40 rounded-xl bg-linear-to-br from-muted/50 to-muted/30 p-8 backdrop-blur overflow-hidden"
              >
                <div className="space-y-4">
                  {visibleLineGroups.map((lineWordIndices, lineIdx) => (
                      <div
                        key={`line-${currentLineIndex + lineIdx}`}
                        className="flex flex-nowrap gap-x-3 overflow-hidden text-2xl md:text-3xl leading-relaxed font-mono"
                      >
                        {lineWordIndices.map((wordIndex) => {
                          const word = words[wordIndex];
                          if (!word) return null;
                          return (
                            <span
                              key={word.id || wordIndex}
                              className={getWordClassName(wordIndex, word.word)}
                            >
                              {word.word}
                            </span>
                          );
                        })}
                      </div>
                    ))}
                </div>
              </div>

              {/* Input Field */}
              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentInput}
                  onChange={handleInputChange}
                  className={cn(
                    "w-full rounded-xl border-2 bg-background px-6 py-4 text-2xl md:text-3xl font-mono",
                    "focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary",
                    "transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                  placeholder={
                    isActive
                      ? "Type here..."
                      : "Click here and start typing to begin..."
                  }
                  disabled={isFinished}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />

                {!isActive && !isFinished && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Keyboard className="h-4 w-4" />
                    <span>Start typing to begin the 60-second test</span>
                  </div>
                )}
              </div>
            </div>
            )
          ) : (
            /* Results */
            <div className="space-y-8 py-8">
              <div className="text-center space-y-4">
                {(() => {
                  const rating = getPerformanceRating();
                  const Icon = rating.icon;
                  return (
                    <>
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
                        <Icon className={cn("h-12 w-12", rating.color)} />
                      </div>
                      <div>
                        <h2 className="text-5xl font-bold mb-2">
                          Test Complete!
                        </h2>
                        <p
                          className={cn("text-2xl font-semibold", rating.color)}
                        >
                          {rating.label}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                <div className="text-center space-y-2 p-6 rounded-xl bg-primary/5 border-2 border-primary/20">
                  <Zap className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-5xl font-bold text-primary">{wpm}</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    Words per minute
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({rawWpm} raw WPM)
                  </p>
                </div>
                <div className="text-center space-y-2 p-6 rounded-xl bg-muted/50 border-2">
                  <Target className="h-8 w-8 mx-auto" />
                  <p className="text-5xl font-bold">{accuracy}%</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    Accuracy
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {incorrectWords} errors
                  </p>
                </div>
                <div className="text-center space-y-2 p-6 rounded-xl bg-muted/50 border-2">
                  <Keyboard className="h-8 w-8 mx-auto" />
                  <p className="text-5xl font-bold">{correctWords}</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    Correct words
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {typedChars} characters
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button onClick={resetTest} size="lg" className="text-lg px-8">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Button (only show during active test) */}
      {isActive && !isFinished && (
        <div className="text-center">
          <Button onClick={resetTest} variant="outline" size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Test
          </Button>
        </div>
      )}
    </div>
  );
}
