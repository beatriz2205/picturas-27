// Validação dos parâmetros das ferramentas de vídeo no cliente (spec 002, T012).
// Cópia das regras de projects/video/tools/trim.js e de allowedHeights (projects/video/limits.js):
// alterar nos dois sítios. O servidor valida sempre.
import type { ProjectVideo, VideoLimits } from "./videos";

// projects/config/video.js → PRESET_HEIGHTS (REQ-VID-COM-010)
const PRESET_HEIGHTS = [2160, 1440, 1080, 720, 480, 360];

export const MIN_TRIM_S = 1;
const EPS = 1e-6;

export interface TrimParams {
  startS: number;
  // null → fim do vídeo (TRIM-004)
  endS: number | null;
  height: number;
}

export type TrimErrors = Partial<Record<keyof TrimParams, string>>;

export const videoFps = (video: ProjectVideo) => video.fps || 30;

// research T1: round(t × fps) / fps (TRIM-005)
export function toFrame(t: number, fps: number) {
  return Math.round((Math.round(t * fps) / fps) * 1e6) / 1e6;
}

// REQ-VID-COM-010: alturas de saída (lado menor), sem exceder a original nem o perfil
export function allowedHeights(video: ProjectVideo, limits: VideoLimits) {
  if (!video.width || !video.height) return [];
  const original = Math.min(video.width, video.height);
  const cap = Math.min(original, limits.limits.maxWidth, limits.limits.maxHeight);
  const heights = PRESET_HEIGHTS.filter((h) => h < original && h <= cap);
  if (original <= cap) heights.unshift(original);
  return heights;
}

const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

// TRIM-003: as mesmas mensagens de contracts/trim-api.md
export function validateTrim(p: TrimParams, video: ProjectVideo, heights?: number[]): TrimErrors {
  const duration = video.durationS ?? 0;
  const fps = videoFps(video);
  const errors: TrimErrors = {};
  const rawEnd = p.endS === null ? duration : p.endS;

  if (!isTime(p.startS)) errors.startS = "Indique um tempo válido";
  if (!isTime(rawEnd)) errors.endS = "Indique um tempo válido";
  if (isTime(p.startS) && isTime(rawEnd)) {
    const start = toFrame(p.startS, fps);
    let end = toFrame(rawEnd, fps);
    if (rawEnd <= duration + EPS && end > duration) end = Math.floor(duration * fps) / fps;
    if (start >= end - EPS) errors.startS = "O início tem de ser anterior ao fim";
    else if (rawEnd > duration + EPS) errors.endS = "O fim excede a duração do vídeo";
    else if (end - start < MIN_TRIM_S - EPS) errors.endS = "O excerto tem de ter pelo menos 1 s";
  }
  if (heights && !heights.includes(p.height)) errors.height = "Resolução não permitida";
  return errors;
}

// mm:ss.fff (TRIM-001)
export function formatTime(s: number) {
  const ms = Math.round(s * 1000);
  const m = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
}

// Aceita "mm:ss.fff", "m:ss", "ss.fff" e vírgula decimal; NaN se não for um tempo
export function parseTime(text: string) {
  const t = text.trim().replace(",", ".");
  const match = /^(?:(\d+):)?(\d+(?:\.\d*)?)$/.exec(t);
  if (!match) return NaN;
  const [, min, sec] = match;
  if (min !== undefined && Number(sec) >= 60) return NaN;
  return (min ? Number(min) * 60 : 0) + Number(sec);
}
