"use client";

import { useEffect, useState } from "react";
import { Download, FileJson, Film, LoaderCircle, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-messages";
import { useProjectVideos } from "@/lib/queries/videos";
import { useDeleteVideo } from "@/lib/mutations/videos";
import { fetchVideoUrl, formatCodecs, formatDuration, formatSize, ProjectVideo } from "@/lib/videos";
import { VideoTaskPanel } from "./video-task-panel";
import { VideoToolMenu } from "./video-tool-menu";
import { DetectionsViewer } from "@/components/video-tools/detections-viewer";

interface Props {
  pid: string;
  ownerId?: string;
  shareId?: string;
  canEdit: boolean;
}

// Vídeos do projeto com os seus metadados e as tarefas de vídeo
// (REQ-VID-COM-002, COM-031; UC-VID-001 passo 6)
export function ProjectVideoList({ pid, ownerId, shareId, canEdit }: Props) {
  const session = useSession();
  const access = { uid: session.user._id, pid, token: session.token, ownerId, shareId };
  const videos = useProjectVideos(session.user._id, pid, session.token, ownerId, shareId);
  const [playing, setPlaying] = useState<ProjectVideo | null>(null);
  const [viewingDetections, setViewingDetections] = useState<ProjectVideo | null>(null);
  const list = videos.data ?? [];
  const names = new Map(list.map((v) => [v.id, v.name]));
  const openResult = (result: ProjectVideo) => {
    if (result.kind === "detections") {
      setPlaying(null);
      setViewingDetections(result);
    } else {
      setViewingDetections(null);
      setPlaying(result);
    }
  };

  return (
    <>
      {list.length > 0 && (
        <section className="border-b border-sidebar-border px-2 md:px-3 xl:px-4 py-3">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Vídeos ({list.length})</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {list.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                sourceName={v.sourceVideoId ? names.get(v.sourceVideoId) ?? null : undefined}
                access={access}
                canEdit={canEdit}
                onPlay={() => setPlaying(v)}
                onViewDetections={() => setViewingDetections(v)}
              />
            ))}
          </div>
        </section>
      )}
      <VideoTaskPanel pid={pid} ownerId={ownerId} shareId={shareId} canEdit={canEdit} onOpenResult={openResult} />
      <VideoPlayerDialog video={playing} access={access} onClose={() => setPlaying(null)} />
      <DetectionsDialog
        detection={viewingDetections}
        source={list.find((item) => item.id === viewingDetections?.sourceVideoId) ?? null}
        access={access}
        onClose={() => setViewingDetections(null)}
      />
    </>
  );
}

function VideoCard({
  video,
  sourceName,
  access,
  canEdit,
  onPlay,
  onViewDetections,
}: {
  video: ProjectVideo;
  // nome do vídeo de origem (resultados); null se a origem foi removida
  sourceName?: string | null;
  access: { uid: string; pid: string; token: string; ownerId?: string; shareId?: string };
  canEdit: boolean;
  onPlay: () => void;
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
    <Card className="w-64 shrink-0 p-3 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <Film className="size-5 shrink-0 mt-0.5 text-muted-foreground" />
        <p className="truncate font-medium" title={video.name}>
          {video.name}
        </p>
      </div>
      {video.origin === "task" && (
        <p className="-mt-1 truncate text-xs text-muted-foreground" title={sourceName ?? undefined}>
          {sourceName ? `Resultado de ${sourceName}` : "Resultado (origem removida)"}
        </p>
      )}
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
      {video.container === "webm" && (
        <p className="text-xs text-muted-foreground">WebM — reproduzir ou descarregar</p>
      )}
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="flex-1" onClick={onPlay}>
          <Play /> Reproduzir
        </Button>
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
      {video.kind === "detections" && (
        <Button size="sm" variant="outline" onClick={onViewDetections}>
          <FileJson /> Ver deteções
        </Button>
      )}
    </Card>
  );
}

function DetectionsDialog({
  detection,
  source,
  access,
  onClose,
}: {
  detection: ProjectVideo | null;
  source: ProjectVideo | null;
  access: { uid: string; pid: string; token: string; ownerId?: string; shareId?: string };
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
function VideoPlayerDialog({
  video,
  access,
  onClose,
}: {
  video: ProjectVideo | null;
  access: { uid: string; pid: string; token: string; ownerId?: string; shareId?: string };
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
