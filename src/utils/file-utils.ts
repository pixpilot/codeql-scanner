import * as fs from 'node:fs';
import * as path from 'node:path';

export class FileUtils {
  static async ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  static readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
  }

  static writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  static isDirectory(filePath: string): boolean {
    return fs.lstatSync(filePath).isDirectory();
  }

  static getFileStats(filePath: string): fs.Stats {
    return fs.statSync(filePath);
  }

  static async copyFile(source: string, destination: string): Promise<void> {
    const destDir = path.dirname(destination);
    await this.ensureDirectoryExists(destDir);

    // Only copy files, not directories
    if (this.isDirectory(source)) {
      return; // Skip directories
    }

    fs.copyFileSync(source, destination);
  }

  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  static joinPath(...paths: string[]): string {
    return path.join(...paths);
  }
}
