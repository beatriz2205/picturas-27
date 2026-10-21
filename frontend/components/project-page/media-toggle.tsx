"use client";

import { Film, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

export type ProjectMedia = "images" | "videos";

// Separador imagens/vídeos: só um tipo de conteúdo visível de cada vez; mantém os restantes parâmetros
export function MediaToggle({
  media,
  imageCount,
  videoCount,
}: {
  media: ProjectMedia;
  imageCount: number;
  videoCount: number;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const buildUrl = (next: ProjectMedia) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("media", next);
    if (!params.get("mode")) params.set("mode", "edit");
    if (!params.get("view")) params.set("view", "grid");
    return `?${params.toString()}`;
  };

  return (
    <div className="flex items-center gap-0.5 p-0.5 border rounded-lg">
      <Button
        variant={media === "images" ? "default" : "secondary"}
        size="sm"
        onClick={() => router.push(buildUrl("images"))}
        aria-pressed={media === "images"}
        className="h-8 px-2.5"
        title="Imagens do projeto"
      >
        <ImageIcon className="h-4 w-4" /> Imagens <span className="tabular-nums opacity-80">{imageCount}</span>
      </Button>
      <Button
        variant={media === "videos" ? "default" : "secondary"}
        size="sm"
        onClick={() => router.push(buildUrl("videos"))}
        aria-pressed={media === "videos"}
        className="h-8 px-2.5"
        title="Vídeos do projeto"
      >
        <Film className="h-4 w-4" /> Vídeos <span className="tabular-nums opacity-80">{videoCount}</span>
      </Button>
    </div>
  );
}
