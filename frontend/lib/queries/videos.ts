import { useQuery } from "@tanstack/react-query";
import { fetchProjectVideos, fetchVideoLimits } from "../videos";

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
