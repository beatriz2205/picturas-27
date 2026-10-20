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
import { useCreateProjectWithVideo, useUploadVideo } from "@/lib/mutations/videos";
import { useVideoLimits } from "@/lib/queries/videos";
import { useVideoUpload } from "@/hooks/use-video-upload";

export default function NewProjectDialog({
  files = [],
  setFiles,
  children,
}: {
  files?: File[];
  setFiles?: (files: File[]) => void;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [tab, setTab] = useState<"images" | "video">("images");

  const session = useSession();
  const addProject = useAddProject(session.user._id, session.token);

  // UC-VID-001/FA4 — criar o projeto a partir de um vídeo (REQ-VID-SUBMIT-002).
  // Só utilizadores registados têm acesso a vídeo (RNG-01).
  const canUseVideo = session.user.type === "free" || session.user.type === "premium";
  const limits = useVideoLimits(canUseVideo ? session.user._id : "", session.token);
  const createWithVideo = useCreateProjectWithVideo(session.user._id, session.token);
  const uploadExistingVideo = useUploadVideo();
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
    let projectId = createdProjectId;
    for (const file of videoFiles) {
      if (projectId) {
        const targetProjectId = projectId;
        const result = await videoFlow.startFor(file, (opts) =>
          uploadExistingVideo.mutateAsync({
            uid: session.user._id,
            pid: targetProjectId,
            token: session.token,
            ...opts,
          }),
        );
        if (!result) return;
      } else {
        const result = await videoFlow.startFor(file, (opts) =>
          createWithVideo.mutateAsync({
            uid: session.user._id,
            token: session.token,
            name,
            ...opts,
          }),
        );
        if (!result) return;
        projectId = result.project._id;
        setCreatedProjectId(projectId);
      }
      setVideoFiles((current) => current.filter((candidate) => candidate !== file));
    }

    if (!projectId) return;
    setOpen(false);
    toast({ title: "Projeto criado com sucesso", description: "Os vídeos foram adicionados ao novo projeto." });
    router.push(`/dashboard/${projectId}`);
  }

  useEffect(() => {
    if (files.length > 0) {
      setOpen(true);
      setTab("images");
    }
  }, [files]);

  useEffect(() => {
    setName("");
    setImageFiles([]);
    setVideoFiles([]);
    setCreatedProjectId(null);
    videoFlow.reset();
    if (setFiles && open === false) setFiles([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setFiles]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (videoBusy) return;
        if (!next && createdProjectId) router.push(`/dashboard/${createdProjectId}`);
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
          disabled={videoBusy || !!createdProjectId}
          onChange={(e) => setName(e.target.value)}
        />
        <Tabs
          value={tab}
          onValueChange={(v) =>
            !videoBusy && !createdProjectId && setTab(v as "images" | "video")
          }
        >
          {canUseVideo && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="images" disabled={!!createdProjectId}>
                Imagens
              </TabsTrigger>
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
              <VideoSubmissionArea files={videoFiles} onSelect={setVideoFiles} disabled={videoBusy} />
              {(videoBusy || videoFlow.phase === "failed") && (
                <>
                  <Progress value={videoFlow.progress} />
                  <p className="text-sm text-muted-foreground">
                    {videoBusy
                      ? videoFlow.progress < 100
                        ? `A enviar… ${videoFlow.progress}%`
                        : "A validar o vídeo…"
                      : "O envio falhou. Pode tentar novamente; os vídeos já enviados continuam no projeto."}
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
              disabled={videoFiles.length === 0 || (!createdProjectId && name === "")}
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
