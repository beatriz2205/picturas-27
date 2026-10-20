// Filtros de vídeo no cliente (spec 004, T010; research F2 e F4).
// A escala e as regras são as do validador do servidor (projects/video/tools/filter.js), que valida sempre.
import type { FilterStyle } from "./videos";

export type FilterTint = "sepia" | "sepia30" | null;
export type FilterStyleId = "none" | "custom" | "bw" | "sepia" | "vintage";

export interface FilterParams {
  style: FilterStyleId;
  tint: FilterTint;
  brightness: number;
  contrast: number;
  saturation: number;
}

export const FILTER_MIN = -100;
export const FILTER_MAX = 100;

export const ADJUSTMENTS = [
  { key: "brightness", label: "Brilho" },
  { key: "contrast", label: "Contraste" },
  { key: "saturation", label: "Saturação" },
] as const;

export type AdjustmentKey = (typeof ADJUSTMENTS)[number]["key"];

export const NEUTRAL_FILTER: FilterParams = { style: "none", tint: null, brightness: 0, contrast: 0, saturation: 0 };

export const TINT_LABELS: Record<string, string> = { sepia: "Sépia", sepia30: "Sépia suave (30%)" };

// A18: −100 → 0, 0 → 1, +100 → 2 (o fator das ferramentas de imagem)
export const toFactor = (v: number) => 1 + v / 100;

// FLT-003: inteiro entre −100 e +100
export const isValidValue = (v: number) => Number.isInteger(v) && v >= FILTER_MIN && v <= FILTER_MAX;

// research F5: sem estilo nem ajuste, o pedido seria recusado com NO_CHANGE
export const isNoChange = (p: FilterParams) => p.tint === null && ADJUSTMENTS.every(({ key }) => p[key] === 0);

// Pré-visualização aproximada (F4, A4): o contrast() do CSS pivota em 50% e não na média da imagem
export function cssFilter(p: FilterParams) {
  const parts = ADJUSTMENTS.filter(({ key }) => p[key] !== 0 && isValidValue(p[key])).map(({ key }) => {
    const fn = key === "saturation" ? "saturate" : key;
    return `${fn}(${toFactor(p[key])})`;
  });
  if (p.tint === "sepia") parts.push("sepia(1)");
  if (p.tint === "sepia30") parts.push("sepia(0.3)");
  return parts.length ? parts.join(" ") : "none";
}

// FLT-002: escolher um estilo preenche os três controlos e a tonalidade
export function fromStyle(s: FilterStyle): FilterParams {
  return {
    style: s.id as FilterStyleId,
    tint: s.tint as FilterTint,
    brightness: s.brightness,
    contrast: s.contrast,
    saturation: s.saturation,
  };
}

// FA1: mexer num controlo passa o estilo a "Personalizado" e mantém a tonalidade
export function withAdjustment(p: FilterParams, key: AdjustmentKey, value: number): FilterParams {
  return { ...p, [key]: value, style: "custom" };
}

export function styleLabel(p: FilterParams, styles: FilterStyle[] | undefined) {
  if (p.style === "none") return "Nenhum";
  if (p.style === "custom") return "Personalizado";
  return styles?.find((s) => s.id === p.style)?.label ?? p.style;
}

export const formatValue = (v: number) => (Number.isFinite(v) ? (v > 0 ? `+${v}` : String(v)) : "—");

// Validação no cliente: mensagem do primeiro erro ou null
export function validateFilter(p: FilterParams) {
  for (const { key, label } of ADJUSTMENTS) {
    if (!isValidValue(p[key])) return `${label}: entre −100 e +100.`;
  }
  if (isNoChange(p)) return "Escolha um estilo ou ajuste pelo menos um controlo.";
  return null;
}
