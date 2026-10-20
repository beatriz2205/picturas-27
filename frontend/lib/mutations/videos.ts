import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProjectWithVideo, deleteVideo, uploadVideo } from "../videos";
import { videosKey } from "../queries/videos";

type Params<F extends (...args: never[]) => unknown> = Parameters<F>[0];

export const useUploadVideo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Params<typeof uploadVideo>) => uploadVideo(p),
    onSuccess: (_data, p) => qc.invalidateQueries({ queryKey: videosKey(p.pid), refetchType: "all" }),
  });
};

export const useDeleteVideo = (pid: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Params<typeof deleteVideo>) => deleteVideo(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: videosKey(pid), refetchType: "all" }),
  });
};

export const useCreateProjectWithVideo = (uid: string, token: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Params<typeof createProjectWithVideo>) => createProjectWithVideo(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", uid, token], refetchType: "all" }),
  });
};
