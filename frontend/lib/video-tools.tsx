// Registo das ferramentas de vídeo no frontend (spec 000, T042).
// Cada spec de ferramenta (002 a 005) acrescenta aqui a sua entrada, com o mesmo id do
// VIDEO_TOOLS de projects/config/video.js.
import type { ComponentType } from "react";
import { FlaskConical, ScanSearch, type LucideIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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

// O menu só mostra as que o servidor aceita (video-limits.tools): o "noop" só aparece fora de produção
export const VIDEO_TOOLS: VideoToolDef[] = [
  // trim (spec 002), convert (spec 003), filter (spec 004), detect (spec 005)
  noop,
  detect,
];

export function availableTools(serverTools: string[] | undefined) {
  return VIDEO_TOOLS.filter((t) => serverTools?.includes(t.id));
}

export function toolLabel(id: string) {
  return VIDEO_TOOLS.find((t) => t.id === id)?.label ?? id;
}
