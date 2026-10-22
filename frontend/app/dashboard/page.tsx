"use client";

import AppDropzone from "@/components/app-dropzone";
import NewProjectDialog from "@/components/dashboard-sidebar/new-project-dialog";
import { extractZipImages } from "@/lib/utils";
import { Film, ImagePlus } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const [files, setFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleDrop = async (acceptedFiles: File[]) => {
    const video = acceptedFiles.find((file) => file.type === "video/mp4");
    if (video) {
      setFiles([]);
      setVideoFile(video);
      return;
    }

    const compatibleFileTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/zip",
    ];

    // Extract images from zip files and filter out incompatible files
    const compatibleFiles: File[] = [];
    for (const file of acceptedFiles) {
      if (file.type === "application/zip") {
        const extractedFiles = await extractZipImages(file);
        compatibleFiles.push(...extractedFiles);
      } else if (compatibleFileTypes.includes(file.type)) {
        compatibleFiles.push(file);
      }
    }

    // Handle duplicate names
    const duplicateNames = new Set<string>();
    files.forEach((file) => duplicateNames.add(file.name));
    const uniqueFiles = compatibleFiles.map((file) => {
      if (duplicateNames.has(file.name)) {
        const newFile = new File(
          [file],
          `${file.name.split(".")[0]} (${duplicateNames.size}).${file.name.split(".")[1]}`,
        );
        duplicateNames.add(newFile.name);
        return newFile;
      }
      duplicateNames.add(file.name);
      return file;
    });

    setFiles(uniqueFiles);
  };

  return (
    <div className="p-8 h-full">
      <NewProjectDialog files={files} setFiles={setFiles} videoFile={videoFile} setVideoFile={setVideoFile}>
        <AppDropzone onDrop={handleDrop}>
          <div className="flex flex-col gap-4 items-center justify-center max-w-[20rem]">
            <ImagePlus size={100} />
            <p className="text-2xl font-medium">
              Pick a project or drag and drop images, a video, or a .zip to create a new one
            </p>
            <Film className="size-8" />
          </div>
        </AppDropzone>
      </NewProjectDialog>
    </div>
  );
}
