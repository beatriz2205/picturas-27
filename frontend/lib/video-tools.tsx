// Registo das ferramentas de vídeo no frontend (spec 000, T042).
// Cada spec de ferramenta (002 a 005) acrescenta aqui a sua entrada, com o mesmo id do
// VIDEO_TOOLS de projects/config/video.js.
import type { ComponentType } from "react";
import { FlaskConical, Scissors, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { FilterPanel } from "@/components/video-tools/filter-panel";
import { TrimEditor } from "@/components/video-tools/trim-editor";
import { FilterParams, NEUTRAL_FILTER, validateFilter } from "./video-filters";
import { allowedHeights, formatTime, TrimParams, validateTrim } from "./video-validation";
import type { Access, ProjectVideo, VideoLimits } from "./videos";

export type VideoToolParams = Record<string, unknown>;

export interface VideoToolFormProps {
  video: ProjectVideo;
  limits: VideoLimits;
  params: VideoToolParams;
  onChange: (params: VideoToolParams) => void;
  // para os pedidos da própria ferramenta (opções, URL de pré-visualização)
  access: Access;
  // nome do resultado escrito no diálogo, para o resumo
  outputName?: string;
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
  // Nome sugerido para o resultado; acompanha os parâmetros até o utilizador o mudar
  outputName?: (video: ProjectVideo, params: VideoToolParams) => string;
  // Diálogo mais largo (ferramentas com pré-visualização)
  wide?: boolean;
  // Texto do botão de confirmação e da resposta 409 DUPLICATE_TASK (TRIM-008)
  submitLabel?: string;
  duplicateMessage?: string;
}

const baseName = (video: ProjectVideo) => video.name.replace(/\.[^.]+$/, "");

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
  outputName: (video) => `${baseName(video)} (filtros).mp4`,
  wide: true,
};

// mm:ss para o nome por omissão (research T5)
const mmss = (s: number) => formatTime(s).slice(0, 5);

// Recorte de um intervalo temporal (spec 002; UC-VID-002)
const trim: VideoToolDef = {
  id: "trim",
  label: "Recortar",
  description: "Guarda um excerto do vídeo como um vídeo novo.",
  icon: Scissors,
  // Original inteiro e na resolução original
  defaultParams: (video, limits): TrimParams & VideoToolParams => ({
    startS: 0,
    endS: null,
    height: allowedHeights(video, limits)[0] ?? Math.min(video.width ?? 0, video.height ?? 0),
  }),
  Form: TrimEditor,
  validate: (params, video) => {
    const errors = validateTrim(params as unknown as TrimParams, video);
    return errors.startS ?? errors.endS ?? null;
  },
  // research T5: "<nome> (recorte mm:ss-mm:ss).mp4"
  outputName: (video, params) => {
    const p = params as unknown as TrimParams;
    const end = p.endS ?? video.durationS ?? 0;
    if (!Number.isFinite(p.startS) || !Number.isFinite(end)) return `${baseName(video)} (recorte).mp4`;
    return `${baseName(video)} (recorte ${mmss(p.startS)}-${mmss(end)}).mp4`;
  },
  wide: true,
  submitLabel: "Iniciar recorte",
  duplicateMessage: "Este recorte já está em curso.",
};

// O menu só mostra as que o servidor aceita (video-limits.tools): o "noop" só aparece fora de produção
export const VIDEO_TOOLS: VideoToolDef[] = [
  // convert (spec 003), detect (spec 005)
  trim,
  filter,
  noop,
];

export function availableTools(serverTools: string[] | undefined) {
  return VIDEO_TOOLS.filter((t) => serverTools?.includes(t.id));
}

export function toolLabel(id: string) {
  return VIDEO_TOOLS.find((t) => t.id === id)?.label ?? id;
}
