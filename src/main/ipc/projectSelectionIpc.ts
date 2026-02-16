import { FileSystemService, type FsLike } from "../services/FileSystemService";
import { MruService, type MruFsLike } from "../services/MruService";
import { ProjectService } from "../services/ProjectService";
import type { DirectoryEntry, RecentProject } from "@shared/types";

export interface ProjectSelectionHandlers {
  fsListDirectory(dirPath: string): Promise<DirectoryEntry[]>;
  fsCreateFolder(parentPath: string, name: string): Promise<void>;
  fsInitProject(dirPath: string): Promise<void>;
  projectOpen(projectPath: string): Promise<void>;
  projectLoadMru(): Promise<RecentProject[]>;
}

export function createProjectSelectionHandlers(
  fs: any,
  fsPromises: FsLike & MruFsLike,
  pitaDir: string,
): ProjectSelectionHandlers {
  const fsService = new FileSystemService(fsPromises);
  const mruService = new MruService(fsPromises, pitaDir);
  const projectService = new ProjectService(fs);

  return {
    fsListDirectory: (dirPath) => fsService.listDirectory(dirPath),
    fsCreateFolder: (parentPath, name) => fsService.createFolder(parentPath, name),
    fsInitProject: (dirPath) => projectService.initProject(dirPath),
    projectOpen: (projectPath) => mruService.addOrBump(projectPath),
    projectLoadMru: () => mruService.load(),
  };
}
