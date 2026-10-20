"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSocket } from "@/lib/queries/projects";
import { videosKey, videoTasksKey } from "@/lib/queries/videos";
import { upsertTask } from "@/lib/mutations/videos";
import { useUpdateSession } from "@/lib/mutations/session";
import { useSession } from "@/providers/session-provider";
import { fetchVideoTasks, isFinal, VideoTask } from "@/lib/videos";

// Mantém a lista de tarefas do projeto atualizada pelo evento video-task-update
// (specs/000-video-common/contracts/ws-events.md; REQ-VID-COM-013).
export function useVideoTaskUpdates(pid: string, ownerId?: string, shareId?: string) {
  const session = useSession();
  const socket = useGetSocket(session.token);
  const qc = useQueryClient();
  const updateSession = useUpdateSession();

  useEffect(() => {
    const s = socket.data;
    if (!s) return;

    const onUpdate = (task: VideoTask) => {
      // O evento chega pela sala do utilizador para todos os seus projetos
      if (task.projectId !== pid) return;
      qc.setQueryData<VideoTask[]>(videoTasksKey(pid), (l) => upsertTask(l, task));
      if (isFinal(task.status)) {
        // Resultado novo, operação consumida ou devolvida (REQ-VID-COM-023)
        qc.invalidateQueries({ queryKey: videosKey(pid), refetchType: "all" });
        qc.invalidateQueries({ queryKey: ["video-limits"] });
        if (task.startedBy === session.user._id) {
          updateSession.mutate({ userId: session.user._id, token: session.token });
        }
      }
    };

    // Eventos perdidos enquanto a ligação esteve em baixo: voltar a pedir as tarefas
    const onReconnect = () => {
      fetchVideoTasks({ uid: session.user._id, pid, token: session.token, ownerId, shareId, status: "all" })
        .then((tasks) => qc.setQueryData(videoTasksKey(pid), tasks))
        .catch(() => {});
    };

    s.on("video-task-update", onUpdate);
    s.on("connect", onReconnect);
    return () => {
      s.off("video-task-update", onUpdate);
      s.off("connect", onReconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.data, pid, ownerId, shareId, session.token, session.user._id, qc]);
}
