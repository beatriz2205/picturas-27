"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/providers/session-provider";
import { useGetSocket } from "@/lib/queries/projects";
import { toolLabel } from "@/lib/video-tools";
import { ackVideoNotifications, fetchVideoNotifications, isFinal, VideoTask } from "@/lib/videos";

const MAX_PENDING_TOASTS = 3;

function text(task: VideoTask) {
  const tool = toolLabel(task.tool);
  if (task.status === "completed") return { title: `${tool}: concluída`, description: "O resultado já está no projeto." };
  if (task.status === "failed") return { title: `${tool}: falhou`, description: task.reason?.message ?? "" };
  return { title: `${tool}: cancelada`, description: task.reason?.message ?? "" };
}

// Avisa quando as tarefas de vídeo do utilizador terminam, incluindo as que terminaram com a aplicação
// fechada (notificações pendentes, D14). Cada aviso é confirmado no servidor e não volta a aparecer
// (REQ-VID-COM-015, COM-052).
export function VideoNotifications() {
  const session = useSession();
  const socket = useGetSocket(session.token);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(new Set<string>());
  const registered = session.user.type === "free" || session.user.type === "premium";
  const uid = session.user._id;

  const notify = (task: VideoTask) => {
    if (shown.current.has(task.id)) return;
    shown.current.add(task.id);
    const { title, description } = text(task);
    const href = `/dashboard/${task.projectId}`;
    const ownProject = !task.ownerId || task.ownerId === uid;
    toast({
      title,
      description,
      variant: task.status === "failed" ? "destructive" : "default",
      action:
        ownProject && pathname !== href ? (
          <ToastAction altText="Abrir o projeto" onClick={() => router.push(href)}>
            Abrir projeto
          </ToastAction>
        ) : undefined,
    });
  };

  // Pendentes ao abrir a aplicação
  useEffect(() => {
    if (!registered) return;
    fetchVideoNotifications(uid, session.token)
      .then((pending) => {
        if (pending.length === 0) return;
        pending.slice(0, MAX_PENDING_TOASTS).forEach(notify);
        if (pending.length > MAX_PENDING_TOASTS) {
          toast({
            title: "Tarefas de vídeo terminadas",
            description: `Mais ${pending.length - MAX_PENDING_TOASTS} tarefas terminaram enquanto esteve fora. Veja-as no painel de cada projeto.`,
          });
        }
        return ackVideoNotifications(uid, session.token, pending.map((t) => t.id));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registered, uid, session.token]);

  // Em tempo real, para as tarefas iniciadas por este utilizador
  useEffect(() => {
    const s = socket.data;
    if (!s || !registered) return;
    const onUpdate = (task: VideoTask) => {
      if (!isFinal(task.status) || task.startedBy !== uid || shown.current.has(task.id)) return;
      notify(task);
      ackVideoNotifications(uid, session.token, [task.id]).catch(() => {});
    };
    s.on("video-task-update", onUpdate);
    return () => {
      s.off("video-task-update", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.data, registered, uid, session.token, pathname]);

  return null;
}
