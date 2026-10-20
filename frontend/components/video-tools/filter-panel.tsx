"use client";

// Painel de filtros visuais e ajustes de cor (spec 004, T011 e T013; UC-VID-004).
// Formulário da ferramenta "filter" no diálogo de video-tool-menu.tsx, que trata do nome do
// resultado, das operações restantes e da submissão.
import { useState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useFilterOptions, useVideoUrl } from "@/lib/queries/videos";
import {
  ADJUSTMENTS,
  AdjustmentKey,
  cssFilter,
  FILTER_MAX,
  FILTER_MIN,
  FilterParams,
  formatValue,
  fromStyle,
  isValidValue,
  NEUTRAL_FILTER,
  styleLabel,
  TINT_LABELS,
  withAdjustment,
} from "@/lib/video-filters";
import type { VideoToolFormProps } from "@/lib/video-tools";
import { RequestSummary } from "./request-summary";

const clamp = (v: number) => (Number.isFinite(v) ? Math.min(FILTER_MAX, Math.max(FILTER_MIN, Math.round(v))) : 0);

export function FilterPanel({ video, params, onChange, access }: VideoToolFormProps) {
  const p = params as unknown as FilterParams;
  const options = useFilterOptions(access, video.id);
  const url = useVideoUrl(access, video.id);
  // Texto escrito em cada campo numérico enquanto não é um valor válido (FLT-003)
  const [drafts, setDrafts] = useState<Partial<Record<AdjustmentKey, string>>>({});
  const set = (next: FilterParams) => onChange(next as unknown as Record<string, unknown>);
  const isNeutral = p.tint === null && p.style === "none" && ADJUSTMENTS.every(({ key }) => p[key] === 0);

  function type(key: AdjustmentKey, text: string) {
    setDrafts((d) => ({ ...d, [key]: text }));
    set(withAdjustment(p, key, /^[-+−]?\d+$/.test(text.trim()) ? Number(text.trim().replace("−", "-")) : NaN));
  }

  function slide(key: AdjustmentKey, value: number) {
    setDrafts((d) => ({ ...d, [key]: undefined }));
    set(withAdjustment(p, key, value));
  }

  function choose(next: FilterParams) {
    setDrafts({});
    set(next);
  }

  const outputFormat = video.audioCodec ? "MP4 (H.264/AAC)" : "MP4 (H.264, sem áudio)";

  return (
    <div className="grid gap-4">
      {/* Pré-visualização aproximada no navegador (FLT-005; research F4) */}
      <div className="overflow-hidden rounded-md bg-black">
        {url.data ? (
          <video
            key={url.data.url}
            src={url.data.url}
            controls
            muted
            loop
            playsInline
            className="max-h-64 w-full"
            style={{ filter: cssFilter(p) }}
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {url.isError ? "Não foi possível carregar a pré-visualização." : <LoaderCircle className="animate-spin" />}
          </div>
        )}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Pré-visualização aproximada; o resultado final é calculado no servidor.
      </p>

      {/* Estilos predefinidos (FLT-001, FLT-002) */}
      <div className="grid gap-2">
        <Label>Estilo</Label>
        <div className="flex flex-wrap gap-2">
          {options.isLoading && <LoaderCircle className="size-4 animate-spin" />}
          {options.isError && <p className="text-sm text-destructive">Não foi possível carregar os estilos.</p>}
          {options.data?.styles.map((s) => (
            <Button
              key={s.id}
              type="button"
              size="sm"
              variant={p.style === s.id ? "default" : "outline"}
              aria-pressed={p.style === s.id}
              onClick={() => choose(fromStyle(s))}
            >
              {s.label}
            </Button>
          ))}
          {p.style === "custom" && (
            <span className="self-center text-sm text-muted-foreground">Personalizado</span>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto"
            disabled={isNeutral}
            onClick={() => choose(NEUTRAL_FILTER)}
          >
            <RotateCcw /> Repor
          </Button>
        </div>
      </div>

      {/* Brilho, contraste e saturação (FLT-001, FLT-003) */}
      {ADJUSTMENTS.map(({ key, label }) => {
        const invalid = !isValidValue(p[key]);
        const id = `filter-${key}`;
        return (
          <div key={key} className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                inputMode="numeric"
                className={cn("h-8 w-20 text-right", invalid && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={invalid}
                aria-describedby={invalid ? `${id}-error` : undefined}
                value={drafts[key] ?? String(p[key])}
                onChange={(e) => type(key, e.target.value)}
                onBlur={() => !invalid && setDrafts((d) => ({ ...d, [key]: undefined }))}
              />
            </div>
            <Slider
              min={FILTER_MIN}
              max={FILTER_MAX}
              step={1}
              value={[clamp(p[key])]}
              onValueChange={([v]) => slide(key, v)}
              aria-label={label}
            />
            {invalid && (
              <p id={`${id}-error`} className="text-xs text-destructive">
                Entre −100 e +100
              </p>
            )}
          </div>
        );
      })}

      <RequestSummary
        items={[
          { label: "Estilo", value: styleLabel(p, options.data?.styles) },
          ...ADJUSTMENTS.map(({ key, label }) => ({ label, value: formatValue(p[key]) })),
          { label: "Tonalidade", value: p.tint ? TINT_LABELS[p.tint] ?? p.tint : "—" },
          { label: "Formato de saída", value: outputFormat },
        ]}
      />
    </div>
  );
}
