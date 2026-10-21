"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useVideoErrorToast } from "@/hooks/use-video-error-toast";
import { useVideoLimits, videoTasksKey } from "@/lib/queries/videos";
import { upsertTask, useCreateVideoTask } from "@/lib/mutations/videos";
import { availableTools, VideoToolDef, VideoToolParams } from "@/lib/video-tools";
import { Access, ProjectVideo, VideoLimits, VideoTask, videoApiError } from "@/lib/videos";
import { OutputNameField } from "@/components/video-tools/output-name-field";
import { highlightVideoTask } from "./video-task-panel";

// Motivo por que as ferramentas não podem ser usadas neste vídeo, ou null (REQ-VID-COM-001, COM-008,
// COM-018, COM-021, CONV-004). O servidor volta a validar tudo na aceitação.
function disabledReason(video: ProjectVideo, limits: VideoLimits | undefined, limitsError: boolean, canEdit: boolean) {
  if (!canEdit) return "Sem permissão de edição neste projeto.";
  if (limitsError) return "Inicie sessão com uma conta registada para usar as ferramentas de vídeo.";
  if (!limits) return "A carregar…";
  if (!video.acceptedAsInput) return "Este vídeo não pode ser usado como entrada (só MP4 com H.264 e AAC ou sem áudio).";
  const l = limits.limits;
  const plan = limits.profile === "premium" ? "Premium" : "Free";
  if (video.sizeBytes > l.maxBytes) return `O vídeo excede o tamanho máximo do plano ${plan}.`;
  if ((video.durationS ?? 0) > l.maxDurationS) return `O vídeo excede a duração máxima do plano ${plan} (${l.maxDurationS} s).`;
  if (video.width && video.height) {
    const short = Math.min(video.width, video.height);
    const long = Math.max(video.width, video.height);
    if (short > Math.min(l.maxWidth, l.maxHeight) || long > Math.max(l.maxWidth, l.maxHeight)) {
      return `O vídeo excede a resolução máxima do plano ${plan} (${l.maxWidth} × ${l.maxHeight}).`;
    }
  }
  if (limits.activeTasks >= l.maxActiveTasks) {
    return `Já tem ${limits.activeTasks} ${limits.activeTasks === 1 ? "tarefa" : "tarefas"} em curso, o máximo do plano ${plan}.`;
  }
  if (limits.remainingOperations === 0) return "Não tem operações disponíveis hoje. Volte amanhã ou mude para Premium.";
  if (availableTools(limits.tools).length === 0) return "Ainda não há ferramentas de vídeo disponíveis.";
  return null;
}

// Ponto de entrada das ferramentas de vídeo; os specs 002 a 005 acrescentam ferramentas em lib/video-tools.tsx
export function VideoToolMenu({ video, access, canEdit }: { video: ProjectVideo; access: Access; canEdit: boolean }) {
  const limits = useVideoLimits(access.uid, access.token);
  const [tool, setTool] = useState<VideoToolDef | null>(null);
  const reason = disabledReason(video, limits.data, limits.isError, canEdit);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline" className="size-8" title={reason ?? "Ferramentas de vídeo"}>
            <Wand2 />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Ferramentas de vídeo</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {reason ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{reason}</p>
          ) : (
            availableTools(limits.data?.tools).map((t) => (
              <DropdownMenuItem key={t.id} onSelect={() => setTool(t)} className="flex items-start gap-2">
                <t.icon className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="block font-medium">{t.label}</span>
                  <span className="block text-xs text-muted-foreground">{t.description}</span>
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {tool && limits.data && (
        <ToolDialog tool={tool} video={video} limits={limits.data} access={access} onClose={() => setTool(null)} />
      )}
    </>
  );
}

function ToolDialog({
  tool,
  video,
  limits,
  access,
  onClose,
}: {
  tool: VideoToolDef;
  video: ProjectVideo;
  limits: VideoLimits;
  access: Access;
  onClose: () => void;
}) {
  const [params, setParams] = useState<VideoToolParams>(() => tool.defaultParams?.(video, limits) ?? {});
  // null: o nome sugerido acompanha os parâmetros até o utilizador o mudar
  const [typedName, setTypedName] = useState<string | null>(null);
  const [nameReady, setNameReady] = useState(true);
  const outputName = typedName ?? tool.outputName?.(video, params) ?? "";
  const create = useCreateVideoTask(access.pid);
  const qc = useQueryClient();
  const { toast } = useToast();
  const showError = useVideoErrorToast();
  const clientError = tool.validate?.(params, video) ?? null;

  function submit() {
    create.mutate(
      { ...access, body: { tool: tool.id, videoId: video.id, params, outputName: outputName.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Tarefa em fila", description: `${tool.label}: acompanhe o progresso no painel de tarefas.` });
          onClose();
        },
        onError: (error) => {
          // TRIM-008: mostrar a tarefa igual que já está em curso em vez de um erro
          const apiError = videoApiError(error);
          if (apiError?.code === "DUPLICATE_TASK" && apiError.task) {
            const task = apiError.task;
            qc.setQueryData<VideoTask[]>(videoTasksKey(access.pid), (list) => upsertTask(list, task));
            toast({ title: tool.duplicateMessage ?? "Este pedido já está em curso.", description: "A tarefa existente está destacada no painel." });
            onClose();
            highlightVideoTask(task.id);
            return;
          }
          showError("video-task", error);
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={tool.wide ? "max-h-[90vh] overflow-y-auto sm:max-w-[640px]" : "sm:max-w-[480px]"}>
        <DialogHeader>
          <DialogTitle>{tool.label}</DialogTitle>
          <DialogDescription className="truncate">{video.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {tool.Form && <tool.Form video={video} limits={limits} params={params} onChange={setParams} access={access} outputName={outputName} />}
          <OutputNameField
            access={access}
            value={outputName}
            placeholder={video.name}
            onChange={setTypedName}
            onReadyChange={setNameReady}
          />
          {clientError && <p className="text-sm text-destructive">{clientError}</p>}
          <p className="text-sm text-muted-foreground">
            {limits.remainingOperations === null
              ? "O original não é alterado; o resultado fica como um vídeo novo no projeto."
              : `Gasta 1 das ${limits.remainingOperations} operações que ainda tem hoje. Se a tarefa falhar ou for cancelada, a operação é devolvida.`}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!!clientError || !nameReady || create.isPending}>
            {create.isPending && <LoaderCircle className="animate-spin" />} {tool.submitLabel ?? "Iniciar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
