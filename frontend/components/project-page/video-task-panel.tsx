"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, FileJson, ListChecks, LoaderCircle, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/hooks/use-toast";
import { useVideoErrorToast } from "@/hooks/use-video-error-toast";
import { useVideoTaskUpdates } from "@/hooks/use-video-tasks";
import { useProjectVideos, useVideoTasks } from "@/lib/queries/videos";
import { useCancelVideoTask } from "@/lib/mutations/videos";
import { cn } from "@/lib/utils";
import { toolLabel } from "@/lib/video-tools";
import { isFinal, ProjectVideo, STATUS_LABELS, VideoTask } from "@/lib/videos";
import { DetectionsDialog, VideoPlayerDialog } from "./project-video-list";

interface Props {
  pid: string;
  ownerId?: string;
  shareId?: string;
  canEdit: boolean;
}

const STATUS_VARIANT: Record<VideoTask["status"], "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  processing: "secondary",
  completed: "default",
  failed: "destructive",
  cancelled: "outline",
};

const VISIBLE_FINAL = 5;

// Destacar uma tarefa no painel, por exemplo a já em curso de um pedido duplicado (TRIM-008)
const HIGHLIGHT_EVENT = "video-task-highlight";
const HIGHLIGHT_MS = 3000;

export function highlightVideoTask(taskId: string) {
  window.dispatchEvent(new CustomEvent<string>(HIGHLIGHT_EVENT, { detail: taskId }));
}

function useHighlighted(taskId: string) {
  const ref = useRef<HTMLLIElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const listener = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== taskId) return;
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setOn(true);
      clearTimeout(timer);
      timer = setTimeout(() => setOn(false), HIGHLIGHT_MS);
    };
    window.addEventListener(HIGHLIGHT_EVENT, listener);
    return () => {
      window.removeEventListener(HIGHLIGHT_EVENT, listener);
      clearTimeout(timer);
    };
  }, [taskId]);
  return { ref, on };
}

// Tarefas de vídeo do projeto num botão do cabeçalho: estado, progresso, motivo, cancelar e abrir o
// resultado (REQ-VID-COM-013, COM-016, COM-020, COM-031, COM-052). Fica sempre montado para receber
// as atualizações em tempo real e abre-se sozinho quando uma tarefa é destacada.
export function VideoTasksButton({ pid, ownerId, shareId, canEdit }: Props) {
  const session = useSession();
  const access = { uid: session.user._id, pid, token: session.token, ownerId, shareId };
  const tasks = useVideoTasks(access);
  const videos = useProjectVideos(session.user._id, pid, session.token, ownerId, shareId);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [playing, setPlaying] = useState<ProjectVideo | null>(null);
  const [viewingDetections, setViewingDetections] = useState<ProjectVideo | null>(null);
  useVideoTaskUpdates(pid, ownerId, shareId);

  const openRef = useRef(open);
  openRef.current = open;

  // abrir o painel e voltar a destacar quando as linhas já estão montadas
  useEffect(() => {
    const listener = (e: Event) => {
      if (openRef.current) return;
      setOpen(true);
      const taskId = (e as CustomEvent<string>).detail;
      setTimeout(() => highlightVideoTask(taskId), 100);
    };
    window.addEventListener(HIGHLIGHT_EVENT, listener);
    return () => window.removeEventListener(HIGHLIGHT_EVENT, listener);
  }, []);

  const list = tasks.data ?? [];
  if (list.length === 0) return null;

  const videoList = videos.data ?? [];
  const byId = new Map(videoList.map((v) => [v.id, v]));
  const active = list.filter((t) => !isFinal(t.status));
  const finished = list.filter((t) => isFinal(t.status));
  const shown = showAll ? finished : finished.slice(0, VISIBLE_FINAL);

  function openResult(result: ProjectVideo) {
    setOpen(false);
    if (result.kind === "detections") setViewingDetections(result);
    else setPlaying(result);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 px-3" title="Tarefas de vídeo">
            {active.length > 0 ? <LoaderCircle className="animate-spin" /> : <ListChecks />}
            Tarefas
            {active.length > 0 && (
              <Badge variant="secondary" className="px-1.5 tabular-nums">{active.length}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(560px,calc(100vw-1rem))] p-0">
          <div className="flex items-center gap-2 border-b px-3 py-2 text-sm">
            <span className="font-semibold">Tarefas de vídeo</span>
            <span className="text-muted-foreground">
              {active.length > 0 ? `${active.length} em curso · ` : ""}
              {finished.length} terminada{finished.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="flex max-h-[60vh] flex-col overflow-y-auto">
            {[...active, ...shown].map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                source={byId.get(t.sourceVideoId)}
                result={t.resultIds.map((id) => byId.get(id)).find(Boolean)}
                access={access}
                canEdit={canEdit}
                onOpenResult={openResult}
              />
            ))}
          </ul>
          {finished.length > VISIBLE_FINAL && (
            <div className="border-t px-1 py-1">
              <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
                {showAll ? <ChevronUp /> : <ChevronDown />}
                {showAll ? "Mostrar menos" : `Mostrar todas (${finished.length})`}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <VideoPlayerDialog video={playing} access={access} onClose={() => setPlaying(null)} />
      <DetectionsDialog
        detection={viewingDetections}
        source={videoList.find((item) => item.id === viewingDetections?.sourceVideoId) ?? null}
        access={access}
        onClose={() => setViewingDetections(null)}
      />
    </>
  );
}

function TaskRow({
  task,
  source,
  result,
  access,
  canEdit,
  onOpenResult,
}: {
  task: VideoTask;
  source?: ProjectVideo;
  result?: ProjectVideo;
  access: { uid: string; pid: string; token: string; ownerId?: string; shareId?: string };
  canEdit: boolean;
  onOpenResult: (video: ProjectVideo) => void;
}) {
  const cancel = useCancelVideoTask(access.pid);
  const { toast } = useToast();
  const showError = useVideoErrorToast();
  const active = !isFinal(task.status);
  const highlight = useHighlighted(task.id);

  function handleCancel() {
    cancel.mutate(
      { ...access, taskId: task.id },
      {
        onSuccess: () => toast({ title: "Tarefa cancelada", description: "A operação foi devolvida." }),
        onError: (error) => showError("video-cancel", error),
      },
    );
  }

  return (
    <li
      ref={highlight.ref}
      className={cn("flex flex-col gap-1 border-b px-3 py-2 text-sm last:border-b-0 transition-shadow", highlight.on && "ring-2 ring-inset ring-primary")}
    >
      <div className="flex items-center gap-2">
        <Badge variant={STATUS_VARIANT[task.status]} className="shrink-0">{STATUS_LABELS[task.status]}</Badge>
        <span className="shrink-0 font-medium">{toolLabel(task.tool)}</span>
        <span className="min-w-0 truncate text-muted-foreground" title={source?.name}>
          {source ? source.name : "origem removida"}
          {task.reason && task.status !== "completed" && ` · ${task.reason.message}`}
        </span>
        <span className="ml-auto flex shrink-0 gap-1">
          {task.status === "completed" && result && (
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => onOpenResult(result)}>
              {result.kind === "detections" ? <FileJson /> : <Play />}
              {result.kind === "detections" ? "Ver deteções" : "Ver resultado"}
            </Button>
          )}
          {active && canEdit && (
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleCancel} disabled={cancel.isPending}>
              {cancel.isPending ? <LoaderCircle className="animate-spin" /> : <X />} Cancelar
            </Button>
          )}
        </span>
      </div>
      {active && (
        <div className="flex items-center gap-2">
          <Progress value={task.status === "queued" ? 0 : task.progress} className="h-1.5" />
          <span className="w-10 text-right text-xs text-muted-foreground">
            {task.status === "queued" ? "—" : `${task.progress}%`}
          </span>
        </div>
      )}
    </li>
  );
}
