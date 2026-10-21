"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, LoaderCircle, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/hooks/use-toast";
import { useVideoErrorToast } from "@/hooks/use-video-error-toast";
import { useVideoTaskUpdates } from "@/hooks/use-video-tasks";
import { useProjectVideos, useVideoTasks } from "@/lib/queries/videos";
import { useCancelVideoTask } from "@/lib/mutations/videos";
import { cn } from "@/lib/utils";
import { toolLabel } from "@/lib/video-tools";
import { isFinal, ProjectVideo, STATUS_LABELS, VideoTask } from "@/lib/videos";

interface Props {
  pid: string;
  ownerId?: string;
  shareId?: string;
  canEdit: boolean;
  onOpenResult: (video: ProjectVideo) => void;
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

// Tarefas de vídeo do projeto: estado, progresso, motivo, cancelar e abrir o resultado
// (REQ-VID-COM-013, COM-016, COM-020, COM-031, COM-052)
export function VideoTaskPanel({ pid, ownerId, shareId, canEdit, onOpenResult }: Props) {
  const session = useSession();
  const tasks = useVideoTasks(session.user._id, pid, session.token, ownerId, shareId);
  const videos = useProjectVideos(session.user._id, pid, session.token, ownerId, shareId);
  const [showAll, setShowAll] = useState(false);
  useVideoTaskUpdates(pid, ownerId, shareId);

  const list = tasks.data ?? [];
  if (list.length === 0) return null;

  const byId = new Map((videos.data ?? []).map((v) => [v.id, v]));
  const active = list.filter((t) => !isFinal(t.status));
  const finished = list.filter((t) => isFinal(t.status));
  const shown = showAll ? finished : finished.slice(0, VISIBLE_FINAL);

  return (
    <section className="border-b border-sidebar-border px-2 md:px-3 xl:px-4 py-3">
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
        Tarefas de vídeo {active.length > 0 && `(${active.length} em curso)`}
      </h2>
      <ul className="flex flex-col gap-2">
        {[...active, ...shown].map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            source={byId.get(t.sourceVideoId)}
            result={t.resultIds.map((id) => byId.get(id)).find(Boolean)}
            access={{ uid: session.user._id, pid, token: session.token, ownerId, shareId }}
            canEdit={canEdit}
            onOpenResult={onOpenResult}
          />
        ))}
      </ul>
      {finished.length > VISIBLE_FINAL && (
        <Button variant="ghost" size="sm" className="mt-1" onClick={() => setShowAll(!showAll)}>
          {showAll ? <ChevronUp /> : <ChevronDown />}
          {showAll ? "Mostrar menos" : `Mostrar todas (${finished.length})`}
        </Button>
      )}
    </section>
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
      className={cn("flex flex-col gap-1 rounded-md border p-2 text-sm transition-shadow", highlight.on && "ring-2 ring-primary")}
    >
      <div className="flex items-center gap-2">
        <Badge variant={STATUS_VARIANT[task.status]}>{STATUS_LABELS[task.status]}</Badge>
        <span className="font-medium">{toolLabel(task.tool)}</span>
        <span className="truncate text-muted-foreground" title={source?.name}>
          {source ? source.name : "origem removida"}
        </span>
        <span className="ml-auto flex shrink-0 gap-1">
          {task.status === "completed" && result && (
            <Button size="sm" variant="outline" onClick={() => onOpenResult(result)}>
              <Play /> Ver resultado
            </Button>
          )}
          {active && canEdit && (
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={cancel.isPending}>
              {cancel.isPending ? <LoaderCircle className="animate-spin" /> : <X />} Cancelar
            </Button>
          )}
        </span>
      </div>
      {active && (
        <div className="flex items-center gap-2">
          <Progress value={task.status === "queued" ? 0 : task.progress} className="h-2" />
          <span className="w-10 text-right text-xs text-muted-foreground">
            {task.status === "queued" ? "—" : `${task.progress}%`}
          </span>
        </div>
      )}
      {task.reason && task.status !== "completed" && <p className="text-xs text-muted-foreground">{task.reason.message}</p>}
    </li>
  );
}
