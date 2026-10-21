"use client";

// Resolução de saída (spec 002, T009; REQ-VID-COM-010). Partilhado com a conversão (spec 003).
// As opções vêm de allowedHeights, calculadas com os mesmos dados de video-limits; a original
// aparece primeiro e pré-selecionada.
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectVideo } from "@/lib/videos";

interface Props {
  video: ProjectVideo;
  heights: number[];
  value: number;
  onChange: (height: number) => void;
  error?: string;
}

export function resolutionLabel(video: ProjectVideo, height: number) {
  const original =
    video.width && video.height ? Math.min(video.width, video.height) : null;
  return `${height}p${height === original ? " (original)" : ""}`;
}

export function ResolutionSelect({
  video,
  heights,
  value,
  onChange,
  error,
}: Props) {
  return (
    <div className="grid gap-1">
      <Label htmlFor="video-resolution">Resolução</Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger id="video-resolution" aria-invalid={!!error}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {heights.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {resolutionLabel(video, h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
