import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelVideoTask, createProjectWithVideo, createVideoTask, deleteVideo, uploadVideo, VideoTask } from "../videos";
import { videosKey, videoTasksKey } from "../queries/videos";

type Params<F extends (...args: never[]) => unknown> = Parameters<F>[0];

export const useUploadVideo = (pid: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Params<typeof uploadVideo>) => uploadVideo(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: videosKey(pid), refetchType: "all" }),
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

// Junta ou substitui uma tarefa na cache da lista do projeto
export function upsertTask(list: VideoTask[] | undefined, task: VideoTask) {
  const rest = (list ?? []).filter((t) => t.id !== task.id);
  return [task, ...rest].sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
}

export const useCreateVideoTask = (pid: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Params<typeof createVideoTask>) => createVideoTask(p),
    onSuccess: (task) => {
      qc.setQueryData<VideoTask[]>(videoTasksKey(pid), (list) => upsertTask(list, task));
      qc.invalidateQueries({ queryKey: ["video-limits"] });
    },
  });
};

export const useCancelVideoTask = (pid: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: Params<typeof cancelVideoTask>) => cancelVideoTask(p),
    onSuccess: (task) => {
      qc.setQueryData<VideoTask[]>(videoTasksKey(pid), (list) => upsertTask(list, task));
      qc.invalidateQueries({ queryKey: ["video-limits"] });
    },
  });
};
