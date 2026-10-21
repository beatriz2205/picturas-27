"use client";

// Editor de recorte (spec 002, T010, T012 e T013; UC-VID-002).
// Formulário da ferramenta "trim" no diálogo de video-tool-menu.tsx, que trata do nome do
// resultado, das operações restantes, da submissão e dos pedidos duplicados.
import { useEffect, useRef } from "react";
import { LoaderCircle, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVideoUrl } from "@/lib/queries/videos";
import { allowedHeights, formatTime, TrimParams, validateTrim, videoFps } from "@/lib/video-validation";
import type { VideoToolFormProps } from "@/lib/video-tools";
import { RequestSummary } from "./request-summary";
import { ResolutionSelect, resolutionLabel } from "./resolution-select";
import { TimelineRange } from "./timeline-range";

// TRIM-002: "Ver fim" reproduz os últimos 2 s do excerto
const PREVIEW_END_S = 2;

export function TrimEditor({ video, limits, params, onChange, access, outputName }: VideoToolFormProps) {
  const p = params as unknown as TrimParams;
  const set = (next: Partial<TrimParams>) => onChange({ ...p, ...next } as unknown as Record<string, unknown>);
  const url = useVideoUrl(access, video.id);
  const player = useRef<HTMLVideoElement>(null);
  const stopAt = useRef<number | null>(null);

  const duration = video.durationS ?? 0;
  const heights = allowedHeights(video, limits);
  const errors = validateTrim(p, video, heights);
  const end = p.endS ?? duration;
  const valid = Object.keys(errors).length === 0;

  // Pára em "fim" com a precisão de um fotograma (o timeupdate só chega a cada ~250 ms)
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const el = player.current;
      const until = stopAt.current;
      if (el && until !== null && el.currentTime >= until) {
        stopAt.current = null;
        el.pause();
        el.currentTime = until;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  function playFrom(from: number, until: number | null) {
    const el = player.current;
    if (!el) return;
    stopAt.current = until;
    el.currentTime = from;
    void el.play().catch(() => {});
  }

  const outputFormat = video.audioCodec ? "MP4 (H.264/AAC)" : "MP4 (H.264, sem áudio)";

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-md bg-black">
        {url.data ? (
          <video
            ref={player}
            key={url.data.url}
            src={url.data.url}
            controls
            playsInline
            preload="metadata"
            className="max-h-64 w-full"
            // pausar no leitor cancela a paragem automática de "Ver fim"
            onPause={() => (stopAt.current = null)}
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {url.isError ? "Não foi possível carregar o vídeo." : <LoaderCircle className="animate-spin" />}
          </div>
        )}
      </div>

      {/* TRIM-002 */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={!url.data || !!errors.startS} onClick={() => playFrom(p.startS, null)}>
          <SkipBack /> Ver início
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!url.data || !valid}
          onClick={() => playFrom(Math.max(p.startS, end - PREVIEW_END_S), end)}
        >
          <SkipForward /> Ver fim
        </Button>
      </div>

      <TimelineRange
        durationS={duration}
        fps={videoFps(video)}
        startS={p.startS}
        endS={p.endS}
        onChange={(range) => set(range)}
        errors={errors}
      />

      <ResolutionSelect video={video} heights={heights} value={p.height} onChange={(height) => set({ height })} error={errors.height} />

      <RequestSummary
        items={[
          { label: "Início", value: Number.isFinite(p.startS) ? formatTime(p.startS) : "—" },
          { label: "Fim", value: p.endS === null ? `fim do vídeo (${formatTime(duration)})` : Number.isFinite(p.endS) ? formatTime(p.endS) : "—" },
          { label: "Duração", value: valid ? formatTime(end - p.startS) : "—" },
          { label: "Resolução", value: resolutionLabel(video, p.height) },
          { label: "Formato de saída", value: outputFormat },
          { label: "Nome", value: outputName?.trim() || video.name },
        ]}
      />
    </div>
  );
}
