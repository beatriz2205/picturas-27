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
  // miniatura gerada no servidor (proposta SUBMIT-011); sem ela, a interface usa um fotograma do vídeo
  thumbnailUrl?: string | null;
  createdAt: string;
}

export interface VideoLimits {
  profile: "free" | "premium";
  limits: { maxBytes: number; maxDurationS: number; maxWidth: number; maxHeight: number; maxActiveTasks: number };
  remainingOperations: number | null;
  dailyOperations: number | null;
  activeTasks: number;
  tools: string[];
}

export type VideoTaskStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

// TaskDTO (specs/000-video-common/contracts/public-api.md)
export interface VideoTask {
  id: string;
  tool: string;
  projectId: string;
  status: VideoTaskStatus;
  progress: number;
  sourceVideoId: string;
  outputName: string | null;
  params: Record<string, unknown>;
  reason: { code: string; message: string } | null;
  resultIds: string[];
  startedBy: string;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  metrics?: { frames?: number; detections?: number; processingMs?: number };
  // só nas notificações pendentes
  ownerId?: string;
}

export const ACTIVE_STATUSES: VideoTaskStatus[] = ["queued", "processing"];
export const isFinal = (s: VideoTaskStatus) => !ACTIVE_STATUSES.includes(s);

// REQ-VID-COM-052: estados em português
export const STATUS_LABELS: Record<VideoTaskStatus, string> = {
  queued: "Em fila",
  processing: "A processar",
  completed: "Concluída",
  failed: "Falhada",
  cancelled: "Cancelada",
};

export interface VideoApiError {
  code: string;
  message: string;
  limit?: { name: string; value: number | string; unit: string; profile: string };
  upgrade?: boolean;
  // 409 DUPLICATE_TASK: a tarefa igual já em curso (TRIM-008)
  task?: VideoTask;
  fields?: Record<string, string>;
  options?: ConvertOptions;
}

export function videoApiError(error: unknown): VideoApiError | null {
  if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === "object") {
    const data = error.response.data as Partial<VideoApiError>;
    if (data.code && data.message) return data as VideoApiError;
  }
  return null;
}

export interface Access {
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

// Rotas de tarefas: mesmo prefixo do projeto, com /video-tasks em vez de /videos
function tasksPath(access: Access) {
  const { base, query } = projectPath(access);
  return { base: base.replace(/\/videos$/, "/video-tasks"), query };
}

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

// Estilos e intervalo dos filtros (specs/004-video-filters/contracts/filter-api.md)
export interface FilterStyle {
  id: string;
  label: string;
  brightness: number;
  contrast: number;
  saturation: number;
  tint: string | null;
}

export interface FilterOptions {
  styles: FilterStyle[];
  range: { min: number; max: number; neutral: number };
}

export type VideoOutputFormat = "mp4" | "webm";

export interface ConvertOptions {
  source: {
    container: "mp4";
    videoCodec: string;
    audioCodec: string | null;
    width: number;
    height: number;
    durationS: number;
    sizeBytes: number;
  };
  formats: { id: VideoOutputFormat; label: string }[];
  heights: { value: number; label: string }[];
  defaults: { format: VideoOutputFormat; height: number };
}

export const fetchConvertOptions = async (access: Access & { videoId: string }) => {
  const { base, query } = projectPath(access);
  const r = await api.get<ConvertOptions>(`${base}/${access.videoId}/convert-options${query}`, {
    headers: authHeader(access.token),
  });
  return r.data;
};

export const fetchFilterOptions = async (access: Access & { videoId: string }) => {
  const { base, query } = projectPath(access);
  const r = await api.get<FilterOptions>(`${base}/${access.videoId}/filter-options${query}`, {
    headers: authHeader(access.token),
  });
  return r.data;
};

// Nome de resultado livre no projeto (specs/002-video-trim/contracts/trim-api.md; TRIM-007)
export const fetchNameAvailable = async (access: Access & { name: string }) => {
  const { base, query } = projectPath(access);
  const name = `${query ? "&" : "?"}name=${encodeURIComponent(access.name)}`;
  const r = await api.get<{ available: boolean; suggestion: string }>(`${base}/name-available${query}${name}`, {
    headers: authHeader(access.token),
  });
  return r.data;
};

export const deleteVideo = async (access: Access & { videoId: string }) => {
  const { base, query } = projectPath(access);
  await api.delete(`${base}/${access.videoId}${query}`, { headers: authHeader(access.token) });
};

// ---- tarefas (UC-VID-002 a 005 usam estas chamadas com a sua ferramenta)

export interface CreateTaskBody {
  tool: string;
  videoId: string;
  outputName?: string;
  params?: Record<string, unknown>;
}

export const createVideoTask = async (access: Access & { body: CreateTaskBody }) => {
  const { base, query } = tasksPath(access);
  const r = await api.post<VideoTask>(`${base}${query}`, access.body, { headers: authHeader(access.token) });
  return r.data;
};

export const fetchVideoTasks = async (access: Access & { status?: "active" | "final" | "all" }) => {
  const { base, query } = tasksPath(access);
  const status = access.status ? `${query ? "&" : "?"}status=${access.status}` : "";
  const r = await api.get<VideoTask[]>(`${base}${query}${status}`, { headers: authHeader(access.token) });
  return r.data;
};

export const cancelVideoTask = async (access: Access & { taskId: string }) => {
  const { base, query } = tasksPath(access);
  const r = await api.post<VideoTask>(`${base}/${access.taskId}/cancel${query}`, {}, { headers: authHeader(access.token) });
  return r.data;
};

export const fetchVideoNotifications = async (uid: string, token: string) => {
  const r = await api.get<VideoTask[]>(`/projects/${uid}/video-notifications`, { headers: authHeader(token) });
  return r.data;
};

export const ackVideoNotifications = async (uid: string, token: string, taskIds: string[]) => {
  await api.post(`/projects/${uid}/video-notifications/ack`, { taskIds }, { headers: authHeader(token) });
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
