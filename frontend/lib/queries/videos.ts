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
export const useVideoTasks = (access: { uid: string; pid: string; token: string; ownerId?: string; shareId?: string }) =>
  useQuery({
    queryKey: ["video-tasks", access.pid, access.uid, access.ownerId, access.shareId],
    queryFn: () => fetchVideoTasks({ ...access, status: "all" }),
    enabled: !!access.token && !!access.pid,
    refetchInterval: (query) =>
      query.state.data?.some((task) => task.status === "queued" || task.status === "processing") ? 2000 : false,
  });
