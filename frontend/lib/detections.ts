export interface DetectionBox {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface Detection {
  tool: "people_ai" | "obj_ai";
  class: string;
  confidence: number;
  box: DetectionBox;
}

export interface DetectionFrame {
  index: number;
  timeS: number;
  detections: Detection[];
}

export interface DetectionsDocument {
  schemaVersion: 1;
  source: {
    videoId: string;
    durationS: number;
    fps: number;
    width: number;
    height: number;
    frameCount: number;
  };
  task: { id: string; tools: ("people_ai" | "obj_ai")[]; threshold: number; model: "yolov5su" };
  classes: string[];
  frames: DetectionFrame[];
}

export async function loadDetections(url: string): Promise<DetectionsDocument> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Não foi possível carregar as deteções (${response.status}).`);
  const document: unknown = await response.json();
  if (
    !document ||
    typeof document !== "object" ||
    !("schemaVersion" in document) ||
    document.schemaVersion !== 1
  ) {
    throw new Error("Formato de deteções não suportado: schemaVersion deve ser 1.");
  }
  return document as DetectionsDocument;
}

export function indexByFrame(document: DetectionsDocument): Map<number, Detection[]> {
  return new Map(document.frames.map((frame) => [frame.index, frame.detections]));
}
