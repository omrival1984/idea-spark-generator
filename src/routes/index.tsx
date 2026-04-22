import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, X, Sparkles, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { generateNames, refineName } from "@/utils/names.functions";

export const Route = createFileRoute("/")({
  component: Index,
});

type NameResult = {
  direction: string;
  name: string;
  reason: string;
};

const REFINEMENT_OPTIONS = [
  "More creative",
  "More minimal",
  "More futuristic",
  "Shorter names",
] as const;

function Index() {
  const generate = useServerFn(generateNames);
  const refine = useServerFn(refineName);

  const [userInput, setUserInput] = useState("");
  const [submittedInput, setSubmittedInput] = useState("");
  const [results, setResults] = useState<NameResult[] | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);
  const [openRefinePanel, setOpenRefinePanel] = useState<number | null>(null);
  const [refinementChoices, setRefinementChoices] = useState<Record<number, string>>({});
  const [inputError, setInputError] = useState<string | null>(null);

  async function handleGenerate(ideaOverride?: string) {
    const idea = (ideaOverride ?? userInput).trim();
    if (!idea) {
      setInputError("Please describe your app idea first.");
      return;
    }
    setInputError(null);
    setLoadingAll(true);
    setSubmittedInput(idea);
    setOpenRefinePanel(null);
    try {
      const res = await generate({ data: { idea } });
      setResults(res.names);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to generate names.";
      toast.error(message, {
        action: {
          label: "Retry",
          onClick: () => handleGenerate(idea),
        },
      });
    } finally {
      setLoadingAll(false);
    }
  }

  async function handleRefine(index: number) {
    if (!results) return;
    const direction = results[index].direction;
    const refinementType = refinementChoices[index] ?? REFINEMENT_OPTIONS[0];
    setRefiningIndex(index);
    try {
      const res = await refine({
        data: {
          idea: submittedInput,
          direction,
          refinementType,
        },
      });
      setResults((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[index] = { direction, name: res.name, reason: res.reason };
        return next;
      });
      setOpenRefinePanel(null);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Refinement failed.";
      toast.error(message, {
        action: {
          label: "Retry",
          onClick: () => handleRefine(index),
        },
      });
    } finally {
      setRefiningIndex(null);
    }
  }

  const canSubmit = userInput.trim().length > 0 && !loadingAll;

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-background"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* Decorative grid + glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "var(--color-primary)", opacity: 0.18 }}
      />

      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:py-20">
        {/* Header */}
        <header className="mb-10 text-center sm:mb-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered naming
          </div>
          <h1 className="bg-gradient-to-b from-foreground to-primary bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl">
            App Name Generator
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Turn your idea into three distinct name directions in seconds.
          </p>
        </header>

        {/* Input */}
        <section className="mx-auto max-w-2xl">
          <Card
            className="rounded-2xl border-border/80 bg-card/70 p-6 backdrop-blur-xl"
            style={{ boxShadow: "var(--glow-primary)" }}
          >
            <Label htmlFor="idea" className="text-sm font-medium text-foreground">
              Describe your app idea
            </Label>
            <Textarea
              id="idea"
              value={userInput}
              onChange={(e) => {
                setUserInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="e.g. A social app for travelers to share hidden spots"
              rows={4}
              className="mt-2 resize-none rounded-xl border-border bg-background/60 text-base focus-visible:ring-primary"
              aria-invalid={!!inputError}
            />
            {inputError && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {inputError}
              </p>
            )}
            <Button
              onClick={() => handleGenerate()}
              disabled={!canSubmit}
              className="mt-4 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition-all hover:brightness-110"
              style={canSubmit ? { boxShadow: "var(--glow-primary)" } : undefined}
              size="lg"
            >
              {loadingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Names
                </>
              )}
            </Button>
          </Card>
        </section>

        {/* Results */}
        {(loadingAll || results) && (
          <section className="mt-12">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {loadingAll && !results
                ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
                : results!.map((r, i) => (
                    <NameCard
                      key={i}
                      result={r}
                      isRefining={refiningIndex === i}
                      isPanelOpen={openRefinePanel === i}
                      refinementChoice={refinementChoices[i] ?? REFINEMENT_OPTIONS[0]}
                      onOpenPanel={() => setOpenRefinePanel(i)}
                      onClosePanel={() => setOpenRefinePanel(null)}
                      onChangeRefinement={(value) =>
                        setRefinementChoices((prev) => ({ ...prev, [i]: value }))
                      }
                      onRefine={() => handleRefine(i)}
                      anyRefining={refiningIndex !== null}
                    />
                  ))}
            </div>

            {results && !loadingAll && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-xl border-primary/40 bg-card/40 text-primary backdrop-blur hover:bg-primary/10 hover:text-primary"
                  onClick={() => handleGenerate(submittedInput)}
                  disabled={refiningIndex !== null}
                >
                  <RefreshCw className="h-4 w-4" />
                  Generate 3 New Names
                </Button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function SkeletonCard() {
  return (
    <Card className="flex flex-col gap-4 rounded-2xl border-border/60 bg-card/50 p-6 backdrop-blur">
      <Skeleton className="h-5 w-32 rounded-full" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="mt-auto pt-2">
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </Card>
  );
}

const DIRECTION_ACCENTS: Record<string, string> = {
  "Clean & Professional": "var(--color-primary)",
  "Creative & Brandable": "var(--color-accent)",
  "Bold & Innovative": "oklch(0.7 0.18 280)",
};

function NameCard({
  result,
  isRefining,
  isPanelOpen,
  refinementChoice,
  onOpenPanel,
  onClosePanel,
  onChangeRefinement,
  onRefine,
  anyRefining,
}: {
  result: NameResult;
  isRefining: boolean;
  isPanelOpen: boolean;
  refinementChoice: string;
  onOpenPanel: () => void;
  onClosePanel: () => void;
  onChangeRefinement: (value: string) => void;
  onRefine: () => void;
  anyRefining: boolean;
}) {
  const accent = DIRECTION_ACCENTS[result.direction] ?? "var(--color-primary)";
  return (
    <Card
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border-border/70 bg-card/60 p-6 backdrop-blur-xl transition-all hover:border-primary/40"
      style={{ boxShadow: `0 0 0 1px ${accent}15, 0 18px 48px -28px ${accent}` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-30 blur-3xl transition-opacity group-hover:opacity-60"
        style={{ background: accent }}
      />

      <span
        className="relative inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{
          color: accent,
          borderColor: `${accent}55`,
          background: `${accent}12`,
        }}
      >
        {result.direction}
      </span>

      {isRefining ? (
        <>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex items-center gap-2 text-xs text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Refining… this usually takes under 10 seconds
          </div>
        </>
      ) : (
        <>
          <h3 className="relative text-2xl font-bold tracking-tight text-foreground">
            {result.name}
          </h3>
          <p className="relative text-sm leading-relaxed text-muted-foreground">
            {result.reason}
          </p>
        </>
      )}

      <div className="relative mt-auto pt-2">
        {isPanelOpen && !isRefining ? (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-background/60 p-3 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Refine direction</span>
              <button
                onClick={onClosePanel}
                className="rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground"
                aria-label="Cancel refinement"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <Select value={refinementChoice} onValueChange={onChangeRefinement}>
              <SelectTrigger className="w-full rounded-lg border-border bg-background/70 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFINEMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={onRefine}
              size="sm"
              className="w-full rounded-lg bg-primary text-primary-foreground hover:brightness-110"
              disabled={anyRefining}
            >
              Regenerate
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-lg border-primary/30 bg-transparent text-primary hover:bg-primary/10 hover:text-primary"
            onClick={onOpenPanel}
            disabled={isRefining || anyRefining}
          >
            Refine this direction
          </Button>
        )}
      </div>
    </Card>
  );
}
