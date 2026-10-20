import { useQuery } from "@tanstack/react-query";
import { fetchProjectVideos, fetchVideoLimits, fetchVideoTasks } from "../videos";

export const videosKey = (pid: string) => ["videos", pid];

export const useProjectVideos = (uid: string, pid: string, token: string, ownerId?: string, shareId?: string) =>
  useQuery({
    queryKey: [...videosKey(pid), uid, token, ownerId, shareId],
    queryFn: () => fetchProjectVideos({ uid, pid, token, ownerId, shareId }),
    enabled: !!token && !!pid,
  });

export const useVideoLimits = (uid: string, token: string) =>
  useQuery({
    queryKey: ["video-limits", uid, token],
    queryFn: () => fetchVideoLimits(uid, token),
    enabled: !!token && !!uid,
    retry: false,
  });

export const videoTasksKey = (pid: string) => ["video-tasks", pid];

// Tarefas do projeto (REQ-VID-COM-031); mantidas atualizadas por use-video-tasks (socket)
export const useVideoTasks = (uid: string, pid: string, token: string, ownerId?: string, shareId?: string) =>
  useQuery({
    queryKey: videoTasksKey(pid),
    queryFn: () => fetchVideoTasks({ uid, pid, token, ownerId, shareId, status: "all" }),
    enabled: !!token && !!pid,
  });
