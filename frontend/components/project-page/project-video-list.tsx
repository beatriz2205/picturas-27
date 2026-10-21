"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileJson, Film, LoaderCircle, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-messages";
import { useProjectVideos, useVideoTasks, useVideoUrl } from "@/lib/queries/videos";
import { useDeleteVideo } from "@/lib/mutations/videos";
import { toolLabel } from "@/lib/video-tools";
import { fetchVideoUrl, formatCodecs, formatDuration, formatSize, ProjectVideo } from "@/lib/videos";
import { VideoToolMenu } from "./video-tool-menu";
import { DetectionsViewer } from "@/components/video-tools/detections-viewer";

type VideoAccess = { uid: string; pid: string; token: string; ownerId?: string; shareId?: string };

interface Props {
  pid: string;
  ownerId?: string;
  shareId?: string;
  canEdit: boolean;
  // edit = vídeos submetidos; results = resultados das ferramentas de vídeo
  mode: "edit" | "results";
  view: "grid" | "carousel";
}

// Vídeos do projeto com miniatura e metadados (REQ-VID-COM-002, COM-030; UC-VID-001 passo 6)
export function ProjectVideoList({ pid, ownerId, shareId, canEdit, mode, view }: Props) {
  const session = useSession();
  const access = { uid: session.user._id, pid, token: session.token, ownerId, shareId };
  const videos = useProjectVideos(session.user._id, pid, session.token, ownerId, shareId);
  const tasks = useVideoTasks(access);
  const [playing, setPlaying] = useState<ProjectVideo | null>(null);
  const [viewingDetections, setViewingDetections] = useState<ProjectVideo | null>(null);
  const all = videos.data ?? [];
  const byId = new Map(all.map((v) => [v.id, v]));
  const toolByTask = new Map((tasks.data ?? []).map((t) => [t.id, t.tool]));
  const list = all.filter((v) => (mode === "edit" ? v.origin === "upload" : v.origin === "task"));

  // linha por baixo do nome: original, ou ferramenta e vídeo de origem
  const describe = (v: ProjectVideo) => {
    if (v.origin === "upload") return "Original";
    const source = v.sourceVideoId ? byId.get(v.sourceVideoId) : undefined;
    const tool = v.sourceTaskId ? toolByTask.get(v.sourceTaskId) : undefined;
    if (!source) return tool ? `${toolLabel(tool)} · origem removida` : "Resultado (origem removida)";
    return tool ? `${toolLabel(tool)} · de ${source.name}` : `Resultado de ${source.name}`;
  };
  const sourceOf = (v: ProjectVideo) => (v.sourceVideoId ? byId.get(v.sourceVideoId) ?? null : null);

  if (videos.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      {list.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-1 text-center text-muted-foreground">
          <Film className="size-8" />
          <p>
            {mode === "edit"
              ? "Ainda não há vídeos submetidos neste projeto."
              : "Ainda não há resultados de vídeo."}
          </p>
          <p className="text-sm">
            {mode === "edit"
              ? "Use “Adicionar vídeo” para submeter um."
              : "Aplique uma ferramenta de vídeo a um original; os resultados aparecem aqui."}
          </p>
        </div>
      ) : view === "carousel" ? (
        <div className="size-full px-2 sm:px-16 py-2">
          <Carousel>
            <CarouselContent>
              {list.map((v) => (
                <CarouselItem key={v.id}>
                  <VideoStage
                    video={v}
                    source={sourceOf(v)}
                    description={describe(v)}
                    access={access}
                    canEdit={canEdit}
                    onViewDetections={() => setViewingDetections(v)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 md:p-3 lg:grid-cols-3 xl:p-4 2xl:grid-cols-4">
          {list.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              source={sourceOf(v)}
              description={describe(v)}
              access={access}
              canEdit={canEdit}
              onPlay={() => setPlaying(v)}
              onViewDetections={() => setViewingDetections(v)}
            />
          ))}
        </div>
      )}
      <VideoPlayerDialog video={playing} access={access} onClose={() => setPlaying(null)} />
      <DetectionsDialog
        detection={viewingDetections}
        source={viewingDetections ? sourceOf(viewingDetections) : null}
        access={access}
        onClose={() => setViewingDetections(null)}
      />
    </>
  );
}

// Só pede o URL quando o cartão fica visível
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);
  return { ref, inView };
}

// Miniatura: a do servidor quando existir; senão um fotograma do próprio vídeo (as deteções usam a
// origem). Sem vídeo disponível, um ícone.
function VideoThumbnail({
  video,
  source,
  access,
}: {
  video: ProjectVideo;
  source: ProjectVideo | null;
  access: VideoAccess;
}) {
  const target = video.kind === "detections" ? source : video;
  const { ref, inView } = useInView<HTMLDivElement>();
  const url = useVideoUrl(access, inView && target && !target.thumbnailUrl ? target.id : "");
  const [failed, setFailed] = useState(false);
  const at = Math.min(1, (target?.durationS ?? 0) * 0.1);

  return (
    <div ref={ref} className="relative aspect-video overflow-hidden bg-muted">
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
        {video.kind === "detections" ? <FileJson className="size-8" /> : <Film className="size-8" />}
      </div>
      {target?.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={target.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        url.data &&
        !failed && (
          <video
            src={`${url.data.url}#t=${at}`}
            preload="metadata"
            muted
            playsInline
            className="absolute inset-0 size-full object-cover"
            onError={() => setFailed(true)}
          />
        )
      )}
      {video.kind === "detections" ? (
        <span className="absolute left-2 top-2 rounded bg-background/85 px-1.5 py-0.5 text-xs font-medium">
          Deteções
        </span>
      ) : (
        video.durationS != null && (
          <span className="absolute bottom-2 right-2 rounded bg-background/85 px-1.5 py-0.5 text-xs font-medium tabular-nums">
            {formatDuration(video.durationS)}
          </span>
        )
      )}
    </div>
  );
}

function VideoMetadata({ video }: { video: ProjectVideo }) {
  return (
    <dl className="grid grid-cols-2 gap-x-2 text-xs text-muted-foreground">
      <dt>Duração</dt>
      <dd className="text-right">{formatDuration(video.durationS)}</dd>
      <dt>Resolução</dt>
      <dd className="text-right">{video.width && video.height ? `${video.width} × ${video.height}` : "—"}</dd>
      <dt>Tamanho</dt>
      <dd className="text-right">{formatSize(video.sizeBytes)}</dd>
      <dt>Formato</dt>
      <dd className="text-right">{formatCodecs(video)}</dd>
    </dl>
  );
}

// Reproduzir ou ver deteções, descarregar, ferramentas e remover
function VideoActions({
  video,
  access,
  canEdit,
  onPlay,
  onViewDetections,
}: {
  video: ProjectVideo;
  access: VideoAccess;
  canEdit: boolean;
  onPlay?: () => void;
  onViewDetections: () => void;
}) {
  const { toast } = useToast();
  const remove = useDeleteVideo(access.pid);
  const [downloading, setDownloading] = useState(false);
  async function download() {
    setDownloading(true);
    try {
      const { url } = await fetchVideoUrl({ ...access, videoId: video.id, download: true });
      window.location.assign(url);
    } catch (error) {
      const { title, description } = getErrorMessage("video-load", error);
      toast({ title, description, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }

  function handleRemove() {
    if (!window.confirm(`Remover "${video.name}" do projeto? O ficheiro é apagado.`)) return;
    remove.mutate(
      { ...access, videoId: video.id },
      {
        onSuccess: () => toast({ title: "Vídeo removido" }),
        onError: (error) => {
          const { title, description } = getErrorMessage("video-delete", error);
          toast({ title, description, variant: "destructive" });
        },
      },
    );
  }

  return (
    <div className="flex gap-1">
      {video.kind === "detections" ? (
        <Button size="sm" variant="outline" className="flex-1" onClick={onViewDetections}>
          <FileJson /> Ver deteções
        </Button>
      ) : (
        onPlay && (
          <Button size="sm" variant="outline" className="flex-1" onClick={onPlay}>
            <Play /> Reproduzir
          </Button>
        )
      )}
      <Button size="icon" variant="outline" className="size-8" title="Descarregar" onClick={download} disabled={downloading}>
        {downloading ? <LoaderCircle className="animate-spin" /> : <Download />}
      </Button>
      {video.kind === "video" && <VideoToolMenu video={video} access={access} canEdit={canEdit} />}
      {canEdit && (
        <Button size="icon" variant="outline" className="size-8" title="Remover" onClick={handleRemove} disabled={remove.isPending}>
          {remove.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
        </Button>
      )}
    </div>
  );
}

function VideoCard({
  video,
  source,
  description,
  access,
  canEdit,
  onPlay,
  onViewDetections,
}: {
  video: ProjectVideo;
  source: ProjectVideo | null;
  description: string;
  access: VideoAccess;
  canEdit: boolean;
  onPlay: () => void;
  onViewDetections: () => void;
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <button
        type="button"
        className="text-left"
        onClick={video.kind === "detections" ? onViewDetections : onPlay}
        title={video.kind === "detections" ? "Ver deteções" : "Reproduzir"}
      >
        <VideoThumbnail video={video} source={source} access={access} />
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate font-medium" title={video.name}>
            {video.name}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={description}>
            {description}
          </p>
        </div>
        <VideoMetadata video={video} />
        {video.container === "webm" && (
          <p className="text-xs text-muted-foreground">WebM — reproduzir ou descarregar</p>
        )}
        <div className="mt-auto">
          <VideoActions
            video={video}
            access={access}
            canEdit={canEdit}
            onPlay={onPlay}
            onViewDetections={onViewDetections}
          />
        </div>
      </div>
    </Card>
  );
}

// Vista carrossel: um vídeo de cada vez, reproduzido na própria página
function VideoStage({
  video,
  source,
  description,
  access,
  canEdit,
  onViewDetections,
}: {
  video: ProjectVideo;
  source: ProjectVideo | null;
  description: string;
  access: VideoAccess;
  canEdit: boolean;
  onViewDetections: () => void;
}) {
  const playable = video.kind === "video";
  const url = useVideoUrl(access, playable ? video.id : "");
  const [retried, setRetried] = useState(false);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3">
      {playable ? (
        url.data ? (
          <video
            key={url.data.url}
            controls
            preload="metadata"
            className="max-h-[60vh] w-full rounded-md bg-black"
            onError={() => {
              // URL expirado: pedir um novo uma vez
              if (!retried) {
                setRetried(true);
                url.refetch();
              }
            }}
          >
            <source src={url.data.url} type={video.container === "webm" ? "video/webm" : "video/mp4"} />
          </video>
        ) : (
          <div className="flex aspect-video max-h-[60vh] items-center justify-center rounded-md bg-muted">
            <LoaderCircle className="animate-spin" />
          </div>
        )
      ) : (
        <button type="button" className="overflow-hidden rounded-md" onClick={onViewDetections} title="Ver deteções">
          <VideoThumbnail video={video} source={source} access={access} />
        </button>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" title={video.name}>
            {video.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
          {video.container === "webm" && (
            <p className="text-xs text-muted-foreground">WebM — reproduzir ou descarregar</p>
          )}
        </div>
        <div className="sm:w-64">
          <VideoMetadata video={video} />
        </div>
        <div className="sm:w-56">
          <VideoActions video={video} access={access} canEdit={canEdit} onViewDetections={onViewDetections} />
        </div>
      </div>
    </div>
  );
}

export function DetectionsDialog({
  detection,
  source,
  access,
  onClose,
}: {
  detection: ProjectVideo | null;
  source: ProjectVideo | null;
  access: VideoAccess;
  onClose: () => void;
}) {
  const [detectionUrl, setDetectionUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  useEffect(() => {
    setDetectionUrl(null);
    setSourceUrl(null);
    if (!detection || !source) return;
    Promise.all([
      fetchVideoUrl({ ...access, videoId: detection.id }),
      fetchVideoUrl({ ...access, videoId: source.id }),
    ]).then(([json, video]) => {
      setDetectionUrl(json.url);
      setSourceUrl(video.url);
    }).catch(() => {
      setDetectionUrl(null);
      setSourceUrl(null);
    });
  }, [access, detection, source]);

  return (
    <Dialog open={!!detection} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-[1100px]">
        <DialogHeader><DialogTitle>{detection?.name}</DialogTitle></DialogHeader>
        {detectionUrl && sourceUrl ? <DetectionsViewer videoUrl={sourceUrl} detectionsUrl={detectionUrl} /> : <LoaderCircle className="mx-auto animate-spin" />}
      </DialogContent>
    </Dialog>
  );
}

// Reprodução com URL temporário de 15 min; se expirar, pede um novo (REQ-VID-COM-030, COM-050)
export function VideoPlayerDialog({
  video,
  access,
  onClose,
}: {
  video: ProjectVideo | null;
  access: VideoAccess;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [retried, setRetried] = useState(false);
  const videoId = video?.id;

  async function load(id: string) {
    try {
      const r = await fetchVideoUrl({ ...access, videoId: id });
      setUrl(r.url);
    } catch {
      setUrl(null);
    }
  }

  useEffect(() => {
    setUrl(null);
    setRetried(false);
    if (videoId) load(videoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <Dialog
      open={!!video}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="truncate">{video?.name}</DialogTitle>
        </DialogHeader>
        {url ? (
          <video
            key={url}
            controls
            autoPlay
            className="w-full max-h-[70vh] rounded-md bg-black"
            onError={() => {
              // URL expirado: pedir um novo uma vez
              if (videoId && !retried) {
                setRetried(true);
                load(videoId);
              }
            }}
          >
            <source src={url} type={video?.container === "webm" ? "video/webm" : "video/mp4"} />
          </video>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <LoaderCircle className="animate-spin" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
