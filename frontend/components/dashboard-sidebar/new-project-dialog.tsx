import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAddProject } from "@/lib/mutations/projects";
import ImageSubmissionArea from "../image-submission-area";
import VideoSubmissionArea from "../video-submission-area";
import { useSession } from "@/providers/session-provider";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/error-messages";
import { useCreateProjectWithVideo } from "@/lib/mutations/videos";
import { useVideoLimits } from "@/lib/queries/videos";
import { useVideoUpload } from "@/hooks/use-video-upload";

export default function NewProjectDialog({
  files = [],
  setFiles,
  videoFile = null,
  setVideoFile,
  children,
}: {
  files?: File[];
  setFiles?: (files: File[]) => void;
  videoFile?: File | null;
  setVideoFile?: (file: File | null) => void;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [tab, setTab] = useState<"images" | "video">("images");

  const session = useSession();
  const addProject = useAddProject(session.user._id, session.token);

  // UC-VID-001/FA4 — criar o projeto a partir de um vídeo (REQ-VID-SUBMIT-002).
  // Só utilizadores registados têm acesso a vídeo (RNG-01).
  const canUseVideo = session.user.type === "free" || session.user.type === "premium";
  const limits = useVideoLimits(canUseVideo ? session.user._id : "", session.token);
  const createWithVideo = useCreateProjectWithVideo(session.user._id, session.token);
  const videoFlow = useVideoUpload<{ project: { _id: string } }>(limits.data);
  const videoBusy = videoFlow.phase === "uploading";

  function handleCreate() {
    addProject.mutate(
      {
        uid: session.user._id,
        token: session.token,
        name: name,
        images: imageFiles,
      },
      {
        onSuccess: (project) => {
          setOpen(false);
          toast({
              title: "Projeto criado com sucesso",
              description: "As imagens foram adicionadas ao novo projeto.",
          });
          if (project) router.push(`/dashboard/${project._id}`);
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("project-create", error);
          toast({
            title,
            description,
            variant: "destructive",
          });
        },
      },
    );
  }

  async function handleCreateWithVideo() {
    const result = await videoFlow.start((opts) =>
      createWithVideo.mutateAsync({ uid: session.user._id, token: session.token, name, ...opts }),
    );
    if (result) {
      setOpen(false);
      toast({ title: "Projeto criado com sucesso", description: "O vídeo foi adicionado ao novo projeto." });
      router.push(`/dashboard/${result.project._id}`);
    }
  }

  useEffect(() => {
    if (files.length > 0) {
      setOpen(true);
      setTab("images");
    }
  }, [files]);

  useEffect(() => {
    if (videoFile) {
      videoFlow.setFile(videoFile);
      setOpen(true);
      setTab("video");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFile]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (videoBusy) return;
        if (!next) {
          setName("");
          setImageFiles([]);
          videoFlow.reset();
          setFiles?.([]);
          setVideoFile?.(null);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          placeholder="Enter project name"
          value={name}
          disabled={videoBusy}
          onChange={(e) => setName(e.target.value)}
        />
        <Tabs value={tab} onValueChange={(v) => !videoBusy && setTab(v as "images" | "video")}>
          {canUseVideo && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="images">Imagens</TabsTrigger>
              <TabsTrigger value="video">Vídeo</TabsTrigger>
            </TabsList>
          )}
          <TabsContent value="images">
            <ImageSubmissionArea
              onDrop={(files) => setImageFiles(files)}
              receivedFiles={files}
            />
          </TabsContent>
          {canUseVideo && (
            <TabsContent value="video" className="flex flex-col gap-2">
              <VideoSubmissionArea file={videoFlow.file} onSelect={videoFlow.setFile} disabled={videoBusy} />
              {(videoBusy || videoFlow.phase === "failed") && (
                <>
                  <Progress value={videoFlow.progress} />
                  <p className="text-sm text-muted-foreground">
                    {videoBusy
                      ? videoFlow.progress < 100
                        ? `A enviar… ${videoFlow.progress}%`
                        : "A validar o vídeo…"
                      : "O envio falhou. O projeto não foi criado; pode tentar novamente."}
                  </p>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>
        <DialogFooter>
          {tab === "images" ? (
            <Button
              onClick={() => handleCreate()}
              disabled={imageFiles.length <= 0 || name === ""}
              className="inline-flex items-center gap-1"
            >
              <span>Create</span>
              {addProject.isPending && (
                <LoaderCircle className="size-[1em] animate-spin" />
              )}
            </Button>
          ) : videoBusy ? (
            <Button variant="outline" onClick={videoFlow.cancel}>
              Cancelar envio
            </Button>
          ) : (
            <Button
              onClick={handleCreateWithVideo}
              disabled={!videoFlow.file || name === ""}
              className="inline-flex items-center gap-1"
            >
              {videoFlow.phase === "failed" ? (
                <>
                  <RotateCcw className="size-4" /> Tentar novamente
                </>
              ) : (
                <span>Create</span>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
