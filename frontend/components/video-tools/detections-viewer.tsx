"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Layers3, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Detection, DetectionsDocument, indexByFrame, loadDetections } from "@/lib/detections";

interface Props {
  videoUrl: string;
  detectionsUrl: string;
  annotatedVideoUrl?: string;
  onError?: (error: Error) => void;
}

export function DetectionsViewer({ videoUrl, detectionsUrl, annotatedVideoUrl, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<DetectionsDocument | null>(null);
  const [current, setCurrent] = useState<Detection[]>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [toolFilter, setToolFilter] = useState("all");
  const frameIndex = useMemo(() => (document ? indexByFrame(document) : new Map()), [document]);
  const filtered = current.filter((item) => (classFilter === "all" || item.class === classFilter) && (toolFilter === "all" || item.tool === toolFilter));
  const currentFrame = document ? Math.round((videoRef.current?.currentTime ?? 0) * document.source.fps) : 0;

  useEffect(() => {
    loadDetections(detectionsUrl).then(setDocument).catch((error: Error) => onError?.(error));
  }, [detectionsUrl, onError]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !document) return;
    const drawFrame = () => {
      const index = Math.round(video.currentTime * document.source.fps);
      const detections = frameIndex.get(index) ?? [];
      setCurrent(detections);
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = video.videoWidth || document.source.width;
      canvas.height = video.videoHeight || document.source.height;
      context.clearRect(0, 0, canvas.width, canvas.height);
      filteredForCanvas(detections, classFilter, toolFilter).forEach((item) => {
        const { cx, cy, w, h } = item.box;
        const x = (cx - w / 2) * canvas.width;
        const y = (cy - h / 2) * canvas.height;
        const width = w * canvas.width;
        const height = h * canvas.height;
        const label = `${item.class}  ${(item.confidence * 100).toFixed(1)}%`;
        context.strokeStyle = "#4ade80";
        context.lineWidth = Math.max(2, canvas.width / 500);
        context.strokeRect(x, y, width, height);
        context.font = `600 ${Math.max(12, canvas.width / 70)}px sans-serif`;
        const labelWidth = context.measureText(label).width + 12;
        const labelY = Math.max(0, y - 26);
        context.fillStyle = "rgba(5, 46, 22, 0.9)";
        context.fillRect(x, labelY, labelWidth, 24);
        context.fillStyle = "#dcfce7";
        context.fillText(label, x + 6, labelY + 17);
      });
    };
    video.addEventListener("loadedmetadata", drawFrame);
    video.addEventListener("timeupdate", drawFrame);
    drawFrame();
    return () => {
      video.removeEventListener("loadedmetadata", drawFrame);
      video.removeEventListener("timeupdate", drawFrame);
    };
  }, [document, frameIndex, classFilter, toolFilter]);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 content-start gap-3">
        <div
          className="relative flex w-full min-w-0 min-h-[260px] max-h-[56vh] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black shadow-inner"
          style={{ aspectRatio: document ? `${document.source.width} / ${document.source.height}` : "16 / 9" }}
        >
          <video ref={videoRef} src={annotatedVideoUrl ?? videoUrl} controls className="h-full w-full object-contain" />
          {/* Fit the overlay bitmap exactly like the video, including its black margins. */}
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
        </div>
        {document && (
          <div className="grid min-w-0 gap-2" aria-label="Fotogramas com deteções">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Timeline de deteções</span>
              <span>{document.frames.length} pontos</span>
            </div>
            <div className="flex min-w-0 gap-1 overflow-x-auto rounded-md bg-muted p-1"
              tabIndex={0}
              role="region"
              aria-label="Timeline de deteções; deslocar horizontalmente para ver todos os fotogramas">
              {document.frames.map((frame) => (
                <button
                  key={frame.index}
                  type="button"
                  title={`Fotograma ${frame.index}`}
                  className="h-3 min-w-1 flex-1 shrink-0 rounded-sm bg-primary/60 transition hover:bg-primary"
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = frame.timeS;
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {document && (
        <div className="grid min-w-0 content-start gap-3">
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            <Card className="flex items-center gap-2 p-2">
              <Crosshair className="size-4 text-emerald-400" />
              <div><p className="text-[11px] text-muted-foreground">Fotograma</p><p className="font-semibold">{filtered.length}</p></div>
            </Card>
            <Card className="flex items-center gap-2 p-2">
              <Layers3 className="size-4 text-sky-400" />
              <div><p className="text-[11px] text-muted-foreground">Frames</p><p className="font-semibold">{document.frames.length}</p></div>
            </Card>
            <Card className="flex items-center gap-2 p-2">
              <SlidersHorizontal className="size-4 text-violet-400" />
              <div><p className="text-[11px] text-muted-foreground">Limiar</p><p className="font-semibold">{document.task.threshold.toFixed(2)}</p></div>
            </Card>
          </div>
          <div className="grid gap-2 rounded-lg border bg-muted/20 p-3">
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={classFilter} onChange={(event) => setClassFilter(event.target.value)} aria-label="Filtrar classe">
              <option value="all">Todas as classes</option>
              {document.classes.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={toolFilter} onChange={(event) => setToolFilter(event.target.value)} aria-label="Filtrar ferramenta">
              <option value="all">Todas as ferramentas</option>
              {document.task.tools.map((item) => <option key={item}>{item}</option>)}
            </select>
            <Badge variant="secondary">{currentFrame} / {document.source.frameCount} fotogramas</Badge>
          </div>
          <div className="max-h-[36vh] overflow-y-auto rounded-lg border bg-muted/10 p-3">
            {filtered.length ? (
              <div className="grid gap-2">
                {filtered.map((item, index) => (
                  <div key={`${item.tool}-${item.class}-${index}`} className="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm">
                    <span className="font-medium">{item.class}</span>
                    <span className="text-muted-foreground">{item.tool}</span>
                    <span className="font-semibold text-emerald-400">{(item.confidence * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Não há deteções neste fotograma com os filtros atuais.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function filteredForCanvas(detections: Detection[], classFilter: string, toolFilter: string) {
  return detections.filter((item) => (classFilter === "all" || item.class === classFilter) && (toolFilter === "all" || item.tool === toolFilter));
}
