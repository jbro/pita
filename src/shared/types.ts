export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  isGitRepo: boolean;
}

export interface RecentProject {
  path: string;
  pathHash: string;
  lastOpened: string;
}

export interface MruStore {
  recentProjects: RecentProject[];
}
