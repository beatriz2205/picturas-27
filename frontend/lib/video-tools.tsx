// Registo das ferramentas de vídeo no frontend (spec 000, T042).
// Cada spec de ferramenta (002 a 005) acrescenta aqui a sua entrada, com o mesmo id do
// VIDEO_TOOLS de projects/config/video.js.
import type { ComponentType } from "react";
import { FlaskConical, RefreshCw, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { FilterPanel } from "@/components/video-tools/filter-panel";
import { FilterParams, NEUTRAL_FILTER, validateFilter } from "./video-filters";
import type { Access, ProjectVideo, VideoLimits } from "./videos";

export type VideoToolParams = Record<string, unknown>;

export interface VideoToolFormProps {
  video: ProjectVideo;
  limits: VideoLimits;
  params: VideoToolParams;
  onChange: (params: VideoToolParams) => void;
  // para os pedidos da própria ferramenta (opções, URL de pré-visualização)
  access: Access;
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
  // Diálogo mais largo (ferramentas com pré-visualização)
  wide?: boolean;
}

// Worker de teste (REQ-VID-COM-047), sem parâmetros na interface. Os parâmetros de teste do worker
// (sleepS, corrupt) só são usados pelos scripts (specs/000-video-common/checkpoint.sh) através da API.
const noop: VideoToolDef = {
  id: "noop",
  label: "Copiar (teste)",
  description: "Copia o vídeo sem o alterar. Serve para testar a cadeia de processamento.",
  icon: FlaskConical,
};

// Filtros visuais e ajustes de cor (spec 004; UC-VID-004)
const filter: VideoToolDef = {
  id: "filter",
  label: "Filtros",
  description: "Aplica um estilo ou ajusta o brilho, o contraste e a saturação.",
  icon: SlidersHorizontal,
  defaultParams: () => ({ ...NEUTRAL_FILTER }),
  Form: FilterPanel,
  validate: (params) => validateFilter(params as unknown as FilterParams),
  outputName: (video) => `${video.name.replace(/\.[^.]+$/, "")} (filtros).mp4`,
  wide: true,
};

const convert: VideoToolDef = {
  id: "convert",
  label: "Converter",
  description: "Converte o formato ou reduz a resolução do vídeo.",
  icon: RefreshCw,
};

// O menu só mostra as que o servidor aceita (video-limits.tools): o "noop" só aparece fora de produção
export const VIDEO_TOOLS: VideoToolDef[] = [
  // trim (spec 002), detect (spec 005)
  convert,
  filter,
  noop,
];

export function availableTools(serverTools: string[] | undefined) {
  return VIDEO_TOOLS.filter((t) => serverTools?.includes(t.id));
}

export function toolLabel(id: string) {
  return VIDEO_TOOLS.find((t) => t.id === id)?.label ?? id;
}
