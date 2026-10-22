// Registo das ferramentas de vídeo no frontend (spec 000, T042).
// Cada spec de ferramenta (002 a 005) acrescenta aqui a sua entrada, com o mesmo id do
// VIDEO_TOOLS de projects/config/video.js.
import type { ComponentType } from "react";
import { ScanSearch, type LucideIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Scissors, RefreshCw, SlidersHorizontal, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function DetectForm({ params, onChange }: VideoToolFormProps) {
  const tools = Array.isArray(params.tools) ? params.tools : [];
  const threshold = typeof params.threshold === "number" ? params.threshold : 0.5;
  const annotatedVideo = params.annotatedVideo === true;

  const update = (patch: VideoToolParams) => onChange({ ...params, ...patch });

  return (
    <div className="grid gap-3">
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Detetar</legend>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={tools.includes("people_ai")}
            onCheckedChange={(checked) =>
              update({ tools: checked ? [...tools, "people_ai"] : tools.filter((tool) => tool !== "people_ai") })
            }
          />
          Pessoas
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={tools.includes("obj_ai")}
            onCheckedChange={(checked) =>
              update({ tools: checked ? [...tools, "obj_ai"] : tools.filter((tool) => tool !== "obj_ai") })
            }
          />
          Objetos
        </label>
      </fieldset>
      <div className="grid gap-2">
        <Label>Limiar: {threshold.toFixed(2)}</Label>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[threshold]}
          onValueChange={([value]) => update({ threshold: value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={annotatedVideo} onCheckedChange={(checked) => update({ annotatedVideo: checked === true })} />
        Gerar também vídeo anotado
      </label>
    </div>
  );
}

const detect: VideoToolDef = {
  id: "detect",
  label: "Detetar no vídeo",
  description: "Deteta pessoas e objetos ao longo do vídeo e cria um resultado JSON.",
  icon: ScanSearch,
  defaultParams: () => ({ tools: ["people_ai"], threshold: 0.5, annotatedVideo: false }),
  Form: DetectForm,
  validate: (params) => {
    const tools = Array.isArray(params.tools) ? params.tools : [];
    if (!tools.length) return "Escolha pelo menos uma ferramenta de deteção.";
    return null;
  },
  outputName: (video) => `${video.name.replace(/\.[^.]+$/, "")} (deteções)`,
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

const convert: VideoToolDef = {
  id: "convert",
  label: "Converter",
  description: "Converte o formato ou reduz a resolução do vídeo.",
  icon: RefreshCw,
};

// Alterar a velocidade (UC-VID-006; REQ-VID-SPD-001). Os mesmos fatores de projects/video/tools/speed.js
const SPEED_FACTORS = [0.5, 0.75, 1.25, 1.5, 2];
const speedLabel = (f: number) => `${String(f).replace(".", ",")}×`;

function SpeedForm({ video, params, onChange }: VideoToolFormProps) {
  const factor = typeof params.factor === "number" ? params.factor : null;
  const duration = video.durationS ?? 0;
  return (
    <div className="grid gap-3">
      <Label>Velocidade</Label>
      <div className="flex flex-wrap gap-2">
        {SPEED_FACTORS.map((f) => (
          <Button key={f} type="button" size="sm" variant={factor === f ? "default" : "outline"} onClick={() => onChange({ ...params, factor: f })}>
            {speedLabel(f)}
          </Button>
        ))}
      </div>
      {factor && duration > 0 && (
        <p className="text-sm text-muted-foreground">
          {factor < 1 ? "Câmara lenta" : "Acelerado"}: o vídeo passa de {formatTime(duration).slice(0, 5)} para{" "}
          {formatTime(duration / factor).slice(0, 5)}. O áudio acompanha a velocidade sem mudar de tom.
        </p>
      )}
    </div>
  );
}

const speed: VideoToolDef = {
  id: "speed",
  label: "Alterar velocidade",
  description: "Cria uma versão em câmara lenta ou acelerada do vídeo.",
  icon: Gauge,
  defaultParams: () => ({ factor: 2 }),
  Form: SpeedForm,
  validate: (params) => (SPEED_FACTORS.includes(params.factor as number) ? null : "Escolha uma velocidade."),
  outputName: (video, params) => `${baseName(video)} (${speedLabel(Number(params.factor))}).mp4`,
  duplicateMessage: "Esta alteração de velocidade já está em curso.",
};

// O menu só mostra as que o servidor aceita (video-limits.tools).
export const VIDEO_TOOLS: VideoToolDef[] = [
  trim,
  convert,
  filter,
  speed,
  detect,
];

export function availableTools(serverTools: string[] | undefined) {
  return VIDEO_TOOLS.filter((t) => serverTools?.includes(t.id));
}

export function toolLabel(id: string) {
  return VIDEO_TOOLS.find((t) => t.id === id)?.label ?? id;
}
