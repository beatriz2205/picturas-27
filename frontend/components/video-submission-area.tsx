"use client";

import Dropzone from "react-dropzone";
import { useState } from "react";
import { Film, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatSize } from "@/lib/videos";

// Seleção de ficheiros .mp4, com nome e tamanho antes do envio (UC-VID-001, passo 3).
// O formato é confirmado pelo servidor a partir do conteúdo (REQ-VID-COM-003).
export default function VideoSubmissionArea({
  files,
  onSelect,
  disabled,
}: {
  files: File[];
  onSelect: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const { toast } = useToast();

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {files.length > 0 && (
        <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
          {files.map((file, index) => (
            <div key={`${file.name}-${file.lastModified}-${index}`} className="flex w-full min-w-0 items-center gap-3 rounded-xl border p-3">
              <Film className="size-8 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="w-full truncate font-medium" title={file.name}>
                  {file.name}
                </p>
                <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover ficheiro"
                  onClick={() => onSelect(files.filter((_, i) => i !== index))}
                >
                  <X />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      <Dropzone
        multiple
        disabled={disabled}
        accept={{ "video/mp4": [".mp4"] }}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDropAccepted={(acceptedFiles) => {
          setDragging(false);
          onSelect([...files, ...acceptedFiles]);
        }}
        onDropRejected={() => {
          setDragging(false);
          toast({
            title: "Ficheiro não suportado",
            description: "Selecione vídeos MP4 (vídeo H.264 e áudio AAC ou sem áudio).",
            variant: "destructive",
          });
        }}
      >
        {({ getRootProps, getInputProps }) => (
          <div
            {...getRootProps()}
            className={`flex ${files.length > 0 ? "min-h-24" : "h-48"} w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
              dragging ? "border-primary bg-primary/10 text-primary" : "border-neutral-400 text-neutral-400 hover:bg-sidebar"
            }`}
          >
            <input {...getInputProps()} />
            <Film size={48} />
            <p className="font-medium">
              {files.length > 0 ? "Adicionar mais vídeos MP4" : "Arraste vídeos MP4 ou clique para escolher"}
            </p>
            <p className="text-xs">H.264 com áudio AAC ou sem áudio</p>
          </div>
        )}
      </Dropzone>
    </div>
  );
}
