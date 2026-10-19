import axios from "axios";
import { api } from "./axios";

// Contratos: specs/000-video-common/contracts/public-api.md e specs/001-video-submit/contracts/submit-api.md

export interface ProjectVideo {
  id: string;
  kind: "video" | "detections";
  origin: "upload" | "task";
  name: string;
  sizeBytes: number;
  durationS: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  container: "mp4" | "webm" | "json";
  videoCodec: string | null;
  audioCodec: string | null;
  acceptedAsInput: boolean;
  sourceVideoId: string | null;
  sourceTaskId: string | null;
  createdAt: string;
}

export interface VideoLimits {
  profile: "free" | "premium";
  limits: { maxBytes: number; maxDurationS: number; maxWidth: number; maxHeight: number; maxActiveTasks: number };
  dailyOperations: number | null;
}

export interface VideoApiError {
  code: string;
  message: string;
  limit?: { name: string; value: number | string; unit: string; profile: string };
  upgrade?: boolean;
}

export function videoApiError(error: unknown): VideoApiError | null {
  if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === "object") {
    const data = error.response.data as Partial<VideoApiError>;
    if (data.code && data.message) return data as VideoApiError;
  }
  return null;
}

interface Access {
  uid: string;
  pid: string;
  token: string;
  ownerId?: string;
  shareId?: string;
}

// Mesma convenção das rotas de projeto: com link de partilha, o caminho usa o dono e a query leva owner/share
function projectPath({ uid, pid, ownerId, shareId }: Access) {
  const pathUid = shareId && ownerId ? ownerId : uid;
  const qs = new URLSearchParams();
  if (shareId) {
    if (ownerId) qs.set("owner", ownerId);
    qs.set("share", shareId);
  }
  const query = qs.toString();
  return { base: `/projects/${pathUid}/${pid}/videos`, query: query ? `?${query}` : "" };
}

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export const fetchVideoLimits = async (uid: string, token: string) => {
  const r = await api.get<VideoLimits>(`/projects/${uid}/video-limits`, { headers: authHeader(token) });
  return r.data;
};

export const fetchProjectVideos = async (access: Access) => {
  const { base, query } = projectPath(access);
  const r = await api.get<ProjectVideo[]>(`${base}${query}`, { headers: authHeader(access.token) });
  return r.data;
};

export const fetchVideoUrl = async (access: Access & { videoId: string; download?: boolean }) => {
  const { base, query } = projectPath(access);
  const extra = access.download ? `${query ? "&" : "?"}download=1` : "";
  const r = await api.get<{ url: string; expiresAt: string }>(`${base}/${access.videoId}/url${query}${extra}`, {
    headers: authHeader(access.token),
  });
  return r.data;
};

export const deleteVideo = async (access: Access & { videoId: string }) => {
  const { base, query } = projectPath(access);
  await api.delete(`${base}/${access.videoId}${query}`, { headers: authHeader(access.token) });
};

export interface UploadOptions {
  file: File;
  uploadId: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

// UC-VID-001: o mesmo uploadId é reutilizado nas repetições do mesmo envio (REQ-VID-SUBMIT-009)
export const uploadVideo = async (access: Access & UploadOptions) => {
  const { base, query } = projectPath(access);
  const form = new FormData();
  form.append("video", access.file);
  const r = await api.post<ProjectVideo>(`${base}${query}`, form, {
    headers: {
      ...authHeader(access.token),
      "X-Upload-Id": access.uploadId,
      "X-Video-Size": String(access.file.size),
    },
    signal: access.signal,
    onUploadProgress: (e) => {
      if (access.onProgress && e.total) access.onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
  return r.data;
};

// REQ-VID-SUBMIT-002: o projeto só é criado se o vídeo for aceite
export const createProjectWithVideo = async (params: { uid: string; token: string; name: string } & UploadOptions) => {
  const form = new FormData();
  form.append("name", params.name); // antes do ficheiro, para o servidor o ler primeiro
  form.append("video", params.file);
  const r = await api.post<{ project: { _id: string; name: string }; video: ProjectVideo }>(
    `/projects/${params.uid}/video-project`,
    form,
    {
      headers: { ...authHeader(params.token), "X-Upload-Id": params.uploadId, "X-Video-Size": String(params.file.size) },
      signal: params.signal,
      onUploadProgress: (e) => {
        if (params.onProgress && e.total) params.onProgress(Math.round((e.loaded * 100) / e.total));
      },
    },
  );
  return r.data;
};

// Formatação dos metadados (REQ-VID-COM-002)
export function formatDuration(s: number | null) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatCodecs(v: Pick<ProjectVideo, "container" | "videoCodec" | "audioCodec">) {
  const video = v.videoCodec === "h264" ? "H.264" : v.videoCodec === "vp9" ? "VP9" : v.videoCodec ?? "";
  const audio = v.audioCodec === "aac" ? "AAC" : v.audioCodec === "opus" ? "Opus" : v.audioCodec ? v.audioCodec : "sem áudio";
  return `${v.container.toUpperCase()} (${video}/${audio})`;
}
