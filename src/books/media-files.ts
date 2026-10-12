import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Stores files under the media root (served at /media) with fresh UUID names,
 * so a replaced file never shares a URL with its successor.
 */
export class MediaFiles {
  constructor(private readonly root: string) {}

  /** Writes `data` to `<folder>/<uuid><extension>` and returns that relative path. */
  async save(folder: string, data: Buffer, extension: string) {
    const relativePath = `${folder}/${randomUUID()}${extension}`;
    await mkdir(join(this.root, folder), { recursive: true });
    await writeFile(join(this.root, relativePath), data);
    return relativePath;
  }

  /** Copies a stored file into `folder` under a new name and returns that path. */
  async copy(relativePath: string, folder: string) {
    const extension = relativePath.slice(relativePath.lastIndexOf('.'));
    const target = `${folder}/${randomUUID()}${extension}`;
    await mkdir(join(this.root, folder), { recursive: true });
    await copyFile(join(this.root, relativePath), join(this.root, target));
    return target;
  }

  read(relativePath: string) {
    return readFile(join(this.root, relativePath));
  }

  async remove(...relativePaths: (string | null | undefined)[]) {
    await Promise.all(
      relativePaths
        .filter((path): path is string => !!path)
        .map((path) => rm(join(this.root, path), { force: true })),
    );
  }
}
