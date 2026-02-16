import git from "isomorphic-git";

export class ProjectService {
  constructor(private fs: any) {}

  async initProject(dirPath: string): Promise<void> {
    await this.fs.promises.stat(dirPath);
    await git.init({ fs: this.fs, dir: dirPath });
  }
}
