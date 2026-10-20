// Registo das ferramentas de vídeo no frontend (spec 000, T042).
// Cada spec de ferramenta (002 a 005) acrescenta aqui a sua entrada, com o mesmo id do
// VIDEO_TOOLS de projects/config/video.js.
import type { ComponentType } from "react";
import { FlaskConical, type LucideIcon } from "lucide-react";
import type { ProjectVideo, VideoLimits } from "./videos";

export type VideoToolParams = Record<string, unknown>;

export interface VideoToolFormProps {
  video: ProjectVideo;
  limits: VideoLimits;
  params: VideoToolParams;
  onChange: (params: VideoToolParams) => void;
}

export interface VideoToolDef {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  // Parâmetros iniciais para o vídeo escolhido
  defaultParams?: (video: ProjectVideo, limits: VideoLimits) => VideoToolParams;
  // Campos do formulário; sem ele, a ferramenta não tem parâmetros
  Form?: ComponentType<VideoToolFormProps>;
  // Validação no cliente: devolve a mensagem do primeiro erro ou null (o servidor valida sempre)
  validate?: (params: VideoToolParams, video: ProjectVideo) => string | null;
  // Nome sugerido para o resultado
  outputName?: (video: ProjectVideo) => string;
}

// Worker de teste (REQ-VID-COM-047), sem parâmetros na interface. Os parâmetros de teste do worker
// (sleepS, corrupt) só são usados pelos scripts (specs/000-video-common/checkpoint.sh) através da API.
const noop: VideoToolDef = {
  id: "noop",
  label: "Copiar (teste)",
  description: "Copia o vídeo sem o alterar. Serve para testar a cadeia de processamento.",
  icon: FlaskConical,
};

// O menu só mostra as que o servidor aceita (video-limits.tools): o "noop" só aparece fora de produção
export const VIDEO_TOOLS: VideoToolDef[] = [
  // trim (spec 002), convert (spec 003), filter (spec 004), detect (spec 005)
  noop,
];

export function availableTools(serverTools: string[] | undefined) {
  return VIDEO_TOOLS.filter((t) => serverTools?.includes(t.id));
}

export function toolLabel(id: string) {
  return VIDEO_TOOLS.find((t) => t.id === id)?.label ?? id;
}
