"use client";

import { useState } from "react";
import { ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

export interface DetectParams {
  tools: ("people_ai" | "obj_ai")[];
  threshold: number;
  annotatedVideo: boolean;
}

interface Props {
  open: boolean;
  operationsRemaining?: number | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: DetectParams) => void;
}

export function DetectDialog({ open, operationsRemaining, onOpenChange, onSubmit }: Props) {
  const [people, setPeople] = useState(false);
  const [objects, setObjects] = useState(false);
  const [threshold, setThreshold] = useState(0.5);
  const [annotatedVideo, setAnnotatedVideo] = useState(false);
  const tools = [people ? "people_ai" : null, objects ? "obj_ai" : null].filter(
    (tool): tool is "people_ai" | "obj_ai" => tool !== null,
  );

  function submit() {
    if (!tools.length) return;
    onSubmit({ tools, threshold, annotatedVideo });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanSearch /> Detetar no vídeo</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Ferramentas</legend>
            <label className="flex items-center gap-2"><Checkbox checked={people} onCheckedChange={(value) => setPeople(value === true)} /> Pessoas</label>
            <label className="flex items-center gap-2"><Checkbox checked={objects} onCheckedChange={(value) => setObjects(value === true)} /> Objetos</label>
            {!tools.length && <p className="text-sm text-destructive">Escolha pelo menos uma ferramenta.</p>}
          </fieldset>
          <div className="space-y-2">
            <label htmlFor="detect-threshold" className="text-sm font-medium">Limiar: {threshold.toFixed(2)}</label>
            <Slider id="detect-threshold" min={0} max={1} step={0.05} value={[threshold]} onValueChange={([value]) => setThreshold(value)} />
          </div>
          <label className="flex items-center gap-2"><Checkbox checked={annotatedVideo} onCheckedChange={(value) => setAnnotatedVideo(value === true)} /> Gerar também vídeo anotado</label>
          <p className="text-sm text-muted-foreground">
            Conta como 1 operação{operationsRemaining == null ? "" : ` · ${operationsRemaining} operações restantes`}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!tools.length}>Confirmar deteção</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
