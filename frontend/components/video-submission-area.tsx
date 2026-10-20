"use client";

import Dropzone from "react-dropzone";
import { useState } from "react";
import { Film, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatSize } from "@/lib/videos";

// Seleção de um único ficheiro .mp4, com nome e tamanho antes do envio (UC-VID-001, passo 3).
// O formato é confirmado pelo servidor a partir do conteúdo (REQ-VID-COM-003).
export default function VideoSubmissionArea({
  file,
  onSelect,
  disabled,
}: {
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const { toast } = useToast();

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border p-3">
        <Film className="size-8 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" title={file.name}>
            {file.name}
          </p>
          <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
        </div>
        {!disabled && (
          <Button variant="ghost" size="icon" aria-label="Remover ficheiro" onClick={() => onSelect(null)}>
            <X />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="h-48">
      <Dropzone
        multiple={false}
        maxFiles={1}
        disabled={disabled}
        accept={{ "video/mp4": [".mp4"] }}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDropAccepted={(files) => {
          setDragging(false);
          onSelect(files[0] ?? null);
        }}
        onDropRejected={() => {
          setDragging(false);
          toast({
            title: "Ficheiro não suportado",
            description: "Selecione um único vídeo MP4 (vídeo H.264 e áudio AAC ou sem áudio).",
            variant: "destructive",
          });
        }}
      >
        {({ getRootProps, getInputProps }) => (
          <div
            {...getRootProps()}
            className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
              dragging ? "border-primary bg-primary/10 text-primary" : "border-neutral-400 text-neutral-400 hover:bg-sidebar"
            }`}
          >
            <input {...getInputProps()} />
            <Film size={48} />
            <p className="font-medium">Arraste um vídeo MP4 ou clique para escolher</p>
            <p className="text-xs">H.264 com áudio AAC ou sem áudio</p>
          </div>
        )}
      </Dropzone>
    </div>
  );
}
