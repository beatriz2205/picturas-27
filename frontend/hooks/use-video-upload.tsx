"use client";

import { useCallback, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getErrorMessage } from "@/lib/error-messages";
import { formatSize, videoApiError, VideoLimits } from "@/lib/videos";

// Estados do envio no cliente (specs/001-video-submit/data-model.md):
// selecionado → a enviar (n%) → concluído | falhado (repetir com o mesmo uploadId) | cancelado | recusado
export type UploadPhase = "idle" | "selected" | "uploading" | "failed" | "done";

export function useVideoUpload<T>(limits: VideoLimits | undefined) {
  const { toast } = useToast();
  const [file, setFileState] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const uploadIdsRef = useRef(new WeakMap<File, string>());
  const abortRef = useRef<AbortController | null>(null);

  // Cada nova seleção é uma nova submissão, com novo identificador (UC-VID-001/RN6)
  const setFile = useCallback((f: File | null) => {
    setFileState(f);
    setProgress(0);
    setPhase(f ? "selected" : "idle");
    if (f) uploadIdsRef.current.set(f, crypto.randomUUID());
  }, []);

  const reset = useCallback(() => setFile(null), [setFile]);

  // Recusa sem iniciar a transferência quando o ficheiro excede o tamanho do perfil (REQ-VID-SUBMIT-003)
  function tooLarge(f: File) {
    if (!limits || f.size <= limits.limits.maxBytes) return false;
    const plan = limits.profile === "premium" ? "Premium" : "Free";
    toast({
      title: "Vídeo demasiado grande",
      description: `O ficheiro tem ${formatSize(f.size)}; o limite do plano ${plan} é ${limits.limits.maxBytes / (1024 * 1024)} MB.`,
      variant: "destructive",
      action:
        limits.profile === "free" ? (
          <ToastAction altText="Ver Premium" asChild>
            <Link href="/dashboard/account/upgrade">Ver Premium</Link>
          </ToastAction>
        ) : undefined,
    });
    return true;
  }

  async function startFor<R>(
    targetFile: File,
    send: (opts: { file: File; uploadId: string; onProgress: (p: number) => void; signal: AbortSignal }) => Promise<R>,
  ): Promise<R | null> {
    if (tooLarge(targetFile)) return null;
    let uploadId = uploadIdsRef.current.get(targetFile);
    if (!uploadId) {
      uploadId = crypto.randomUUID();
      uploadIdsRef.current.set(targetFile, uploadId);
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("uploading");
    setProgress(0);
    try {
      const result = await send({ file: targetFile, uploadId, onProgress: setProgress, signal: controller.signal });
      setPhase("done");
      return result;
    } catch (error) {
      if (axios.isCancel(error) || controller.signal.aborted) {
        // REQ-VID-SUBMIT-005: o servidor descarta o ficheiro parcial; o projeto não muda
        toast({ title: "Envio cancelado", description: "O vídeo não foi adicionado ao projeto." });
        setPhase("selected");
        uploadIdsRef.current.set(targetFile, crypto.randomUUID());
        return null;
      }
      const apiErr = videoApiError(error);
      if (apiErr && apiErr.code !== "SERVICE_UNAVAILABLE") {
        // Recusa definitiva (formato, limites, permissões): escolher outro ficheiro
        const { title, description } = getErrorMessage("video-upload", error);
        toast({
          title,
          description,
          variant: "destructive",
          action: apiErr.upgrade ? (
            <ToastAction altText="Ver Premium" asChild>
              <Link href="/dashboard/account/upgrade">Ver Premium</Link>
            </ToastAction>
          ) : undefined,
        });
        uploadIdsRef.current.delete(targetFile);
        setFile(null);
        return null;
      }
      // Falha recuperável (rede, armazenamento): permitir repetir com o mesmo uploadId (REQ-VID-SUBMIT-008)
      const { title, description } = getErrorMessage("video-upload", error);
      toast({ title, description, variant: "destructive" });
      setPhase("failed");
      return null;
    } finally {
      abortRef.current = null;
    }
  }

  async function start(
    send: (opts: { file: File; uploadId: string; onProgress: (p: number) => void; signal: AbortSignal }) => Promise<T>,
  ) {
    return file ? startFor<T>(file, send) : null;
  }

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { file, setFile, phase, progress, start, startFor, cancel, reset };
}
