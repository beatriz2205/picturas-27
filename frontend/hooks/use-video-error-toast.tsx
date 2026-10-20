"use client";

import { useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-messages";
import { videoApiError } from "@/lib/videos";

type Context = Parameters<typeof getErrorMessage>[0];

// Mostra um erro de vídeo com a causa e o limite. Para utilizadores Free rejeitados por quota ou
// limite (upgrade: true), acrescenta a ligação ao plano Premium (REQ-VID-COM-007, COM-024).
export function useVideoErrorToast() {
  const { toast } = useToast();
  const router = useRouter();

  return (context: Context, error: unknown) => {
    const { title, description } = getErrorMessage(context, error);
    const upgrade = videoApiError(error)?.upgrade;
    toast({
      title,
      description,
      variant: "destructive",
      action: upgrade ? (
        <ToastAction altText="Ver o plano Premium" onClick={() => router.push("/dashboard/account/upgrade")}>
          Ver Premium
        </ToastAction>
      ) : undefined,
    });
  };
}
