"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useVideoErrorToast } from "@/hooks/use-video-error-toast";
import { useCreateVideoTask } from "@/lib/mutations/videos";
import { useConvertOptions } from "@/lib/queries/videos";
import {
  Access,
  ConvertOptions,
  formatCodecs,
  formatDuration,
  formatSize,
  ProjectVideo,
  VideoLimits,
  VideoOutputFormat,
  videoApiError,
} from "@/lib/videos";
import { RequestSummary } from "./request-summary";

export function ConvertDialog({
  video,
  limits,
  access,
  onClose,
}: {
  video: ProjectVideo;
  limits: VideoLimits;
  access: Access;
  onClose: () => void;
}) {
  const optionsQuery = useConvertOptions(access, video.id);
  const [optionsOverride, setOptionsOverride] = useState<ConvertOptions | null>(null);
  const options = optionsOverride ?? optionsQuery.data;
  const [format, setFormat] = useState<VideoOutputFormat | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [outputBase, setOutputBase] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const create = useCreateVideoTask(access.pid);
  const { toast } = useToast();
  const showError = useVideoErrorToast();
  const selectedFormat = format ?? options?.defaults.format;
  const selectedHeight = height ?? options?.defaults.height;
  const noChange = !!options && selectedFormat === "mp4" && selectedHeight === options.defaults.height;
  const outputName = outputBase.trim() && selectedFormat ? `${outputBase.trim()}.${selectedFormat}` : undefined;

  function submit() {
    if (!selectedFormat || selectedHeight === undefined) return;
    create.mutate(
      {
        ...access,
        body: {
          tool: "convert",
          videoId: video.id,
          params: { format: selectedFormat, height: selectedHeight },
          outputName,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Tarefa em fila",
            description: "Conversão: acompanhe o progresso no painel de tarefas.",
          });
          onClose();
        },
        onError: onTaskError,
      },
    );
  }

  const selectedHeightOption = options?.heights.find((item) => item.value === selectedHeight);
  const outputFormatLabel = options?.formats.find((item) => item.id === selectedFormat)?.label ?? "—";
  const remainingOperations = limits.remainingOperations === null ? "Ilimitadas" : String(limits.remainingOperations);

  function onTaskError(error: unknown) {
    const apiError = videoApiError(error);
    if (apiError?.code === "INVALID_PARAMS" && apiError.options) {
      const updatedOptions = apiError.options;
      setOptionsOverride(updatedOptions);
      setFormat((current) =>
        current && updatedOptions.formats.some((item) => item.id === current) ? current : updatedOptions.defaults.format
      );
      setHeight((current) =>
        current !== null && updatedOptions.heights.some((item) => item.value === current)
          ? current
          : updatedOptions.defaults.height
      );
      const [field, message] = Object.entries(apiError.fields ?? {})[0] ?? ["_", apiError.message];
      setFieldError(field === "_" ? apiError.message : message);
      return;
    }
    showError("video-task", error);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Converter</DialogTitle>
          <DialogDescription className="truncate">{video.name}</DialogDescription>
        </DialogHeader>

        {optionsQuery.isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoaderCircle className="size-5 animate-spin" />
          </div>
        )}
        {optionsQuery.isError && (
          <p className="text-sm text-destructive">
            {videoApiError(optionsQuery.error)?.message ?? "Não foi possível carregar as opções de conversão."}
          </p>
        )}

        {options && (
          <div className="grid gap-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border p-3 text-sm">
              <dt className="text-muted-foreground">Formato original</dt>
              <dd>{formatCodecs(options.source)}</dd>
              <dt className="text-muted-foreground">Resolução</dt>
              <dd>{options.source.width} × {options.source.height}</dd>
              <dt className="text-muted-foreground">Duração</dt>
              <dd>{formatDuration(options.source.durationS)}</dd>
              <dt className="text-muted-foreground">Tamanho</dt>
              <dd>{formatSize(options.source.sizeBytes)}</dd>
            </dl>

            <div className="grid gap-2">
              <Label htmlFor="convert-format">Formato de saída</Label>
              <Select
                value={selectedFormat}
                onValueChange={(value) => {
                  if (value === "mp4" || value === "webm") {
                    setFormat(value);
                    setFieldError(null);
                  }
                }}
              >
                <SelectTrigger id="convert-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.formats.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="convert-height">Resolução de saída</Label>
              <Select
                value={selectedHeight === undefined ? undefined : String(selectedHeight)}
                onValueChange={(value) => {
                  setHeight(Number(value));
                  setFieldError(null);
                }}
              >
                <SelectTrigger id="convert-height">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.heights.map((item) => (
                    <SelectItem key={item.value} value={String(item.value)}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label htmlFor="convert-output-name">Nome do resultado (opcional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="convert-output-name"
                  placeholder={video.name.replace(/\.[^.]+$/, "")}
                  value={outputBase}
                  maxLength={195}
                  onChange={(event) => setOutputBase(event.target.value)}
                />
                <span className="shrink-0 text-sm text-muted-foreground">
                  .{selectedFormat ?? options.defaults.format}
                </span>
              </div>
            </div>

            <RequestSummary
              items={[
                { label: "Formato de saída", value: outputFormatLabel },
                { label: "Resolução", value: selectedHeightOption?.label ?? "—" },
                { label: "Operações restantes", value: remainingOperations },
              ]}
            />

            {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
            {noChange && (
              <p className="text-sm text-muted-foreground">Escolha outro formato ou resolução</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={submit}
            disabled={!options || optionsQuery.isError || noChange || create.isPending}
          >
            {create.isPending && <LoaderCircle className="animate-spin" />}
            Converter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
