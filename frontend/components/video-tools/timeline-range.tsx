"use client";

// Linha temporal de dois marcadores com campos mm:ss.fff sincronizados (spec 002, T008; TRIM-001).
// O fim vazio significa "fim do vídeo" (TRIM-004).
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { formatTime, parseTime } from "@/lib/video-validation";

interface Props {
  durationS: number;
  fps: number;
  startS: number;
  endS: number | null;
  onChange: (range: { startS: number; endS: number | null }) => void;
  errors?: { startS?: string; endS?: string };
}

export function TimelineRange({ durationS, fps, startS, endS, onChange, errors = {} }: Props) {
  // Texto escrito em cada campo enquanto não é um tempo válido
  const [drafts, setDrafts] = useState<{ startS?: string; endS?: string }>({});
  const end = endS ?? durationS;
  const clamp = (v: number) => (Number.isFinite(v) ? Math.min(durationS, Math.max(0, v)) : 0);

  function slide([s, e]: number[]) {
    setDrafts({});
    // Arrastar o fim até ao limite volta a "fim do vídeo"
    onChange({ startS: s, endS: e >= durationS ? null : e });
  }

  function type(key: "startS" | "endS", text: string) {
    setDrafts((d) => ({ ...d, [key]: text }));
    if (key === "endS" && text.trim() === "") return onChange({ startS, endS: null });
    const value = parseTime(text);
    onChange({ startS, endS, [key]: value });
  }

  const fields = [
    { key: "startS" as const, label: "Início", value: formatTime(startS), placeholder: "00:00.000" },
    { key: "endS" as const, label: "Fim", value: endS === null ? "" : formatTime(endS), placeholder: `fim do vídeo (${formatTime(durationS)})` },
  ];

  return (
    <div className="grid gap-3">
      <Slider
        min={0}
        max={durationS}
        step={1 / fps}
        minStepsBetweenThumbs={1}
        value={[clamp(startS), clamp(end)]}
        onValueChange={slide}
        thumbLabels={["Início do excerto", "Fim do excerto"]}
      />
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, value, placeholder }) => {
          const id = `trim-${key}`;
          const error = errors[key];
          return (
            <div key={key} className="grid gap-1">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                inputMode="decimal"
                className={cn("font-mono", error && "border-destructive focus-visible:ring-destructive")}
                placeholder={placeholder}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                value={drafts[key] ?? value}
                onChange={(e) => type(key, e.target.value)}
                onBlur={() => !Number.isNaN(parseTime(drafts[key] ?? value)) && setDrafts((d) => ({ ...d, [key]: undefined }))}
              />
              {error && (
                <p id={`${id}-error`} className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        Duração do excerto:{" "}
        <span className="font-medium text-foreground">
          {Number.isFinite(startS) && Number.isFinite(end) && end > startS ? formatTime(end - startS) : "—"}
        </span>
      </p>
    </div>
  );
}
