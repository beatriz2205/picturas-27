"use client";

import { useState } from "react";
import { Film, LoaderCircle, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import VideoSubmissionArea from "@/components/video-submission-area";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/hooks/use-toast";
import { useVideoUpload } from "@/hooks/use-video-upload";
import { useUploadVideo } from "@/lib/mutations/videos";
import { useVideoLimits } from "@/lib/queries/videos";
import { ProjectVideo } from "@/lib/videos";

// UC-VID-001 — Submeter vídeo a um projeto (specs/001-video-submit)
export function AddVideoDialog({ pid, ownerId, shareId }: { pid: string; ownerId?: string; shareId?: string }) {
  const session = useSession();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const limits = useVideoLimits(session.user._id, session.token);
  const upload = useUploadVideo(pid);
  const flow = useVideoUpload<ProjectVideo>(limits.data);
  const busy = flow.phase === "uploading";

  async function handleSubmit() {
    const video = await flow.start((opts) =>
      upload.mutateAsync({ uid: session.user._id, pid, token: session.token, ownerId, shareId, ...opts }),
    );
    if (video) {
      toast({ title: "Vídeo submetido", description: `${video.name} foi adicionado ao projeto.` });
      flow.reset();
      setOpen(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return; // durante o envio, fechar só com "Cancelar envio"
        if (!next) flow.reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button className="inline-flex" variant="outline">
          <Film /> Adicionar vídeo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Adicionar vídeo</DialogTitle>
          <DialogDescription>
            {limits.data
              ? `Plano ${limits.data.profile === "premium" ? "Premium" : "Free"}: até ${
                  limits.data.limits.maxBytes / (1024 * 1024)
                } MB, ${limits.data.limits.maxDurationS >= 60 ? `${limits.data.limits.maxDurationS / 60} min` : `${limits.data.limits.maxDurationS} s`} e ${
                  limits.data.limits.maxHeight
                }p. A submissão não gasta operações diárias.`
              : "Adicione um vídeo MP4 ao projeto."}
          </DialogDescription>
        </DialogHeader>

        <VideoSubmissionArea file={flow.file} onSelect={flow.setFile} disabled={busy} />

        {(busy || flow.phase === "failed") && (
          <div className="flex flex-col gap-1">
            <Progress value={flow.progress} />
            <p className="text-sm text-muted-foreground">
              {busy
                ? flow.progress < 100
                  ? `A enviar… ${flow.progress}%`
                  : "A validar e guardar o vídeo…"
                : "O envio falhou. Pode tentar novamente."}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {busy ? (
            <Button variant="outline" onClick={flow.cancel}>
              Cancelar envio
            </Button>
          ) : flow.phase === "failed" ? (
            <Button onClick={handleSubmit} className="inline-flex items-center gap-1">
              <RotateCcw className="size-4" /> Tentar novamente
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!flow.file} className="inline-flex items-center gap-1">
              Submeter
            </Button>
          )}
          {busy && <LoaderCircle className="size-5 animate-spin self-center" />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
