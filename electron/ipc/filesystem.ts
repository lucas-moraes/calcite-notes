import { ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import log from 'electron-log';
import { isPathWithinNotesDir } from '../utils/config';

let notesDir: string;

export function setNotesDir(dir: string): void {
  notesDir = dir;
}

export function openNotesFolder(): void {
  shell.openPath(notesDir);
}

export function registerFilesystemHandlers(): void {
  ipcMain.handle('delete-folder', async (_event, folderPath: string) => {
    try {
      if (!folderPath || typeof folderPath !== 'string') {
        return { success: false, error: 'Invalid folder path' };
      }
      
      if (!isPathWithinNotesDir(folderPath, notesDir)) {
        log.error('Attempted to delete folder outside notes directory:', folderPath);
        return { success: false, error: 'Access denied: path outside notes directory' };
      }
      
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
        return { success: true };
      }
      return { success: false, error: 'Folder not found' };
    } catch (e) {
      log.error('Error deleting folder:', e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('has-md-files', async (_event, dirPath: string): Promise<boolean> => {
    if (!dirPath || typeof dirPath !== 'string') {
      return false;
    }
    
    const checkDir = (dir: string): boolean => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (checkDir(fullPath)) return true;
          } else if (entry.name.endsWith('.md')) {
            return true;
          }
        }
      } catch {
        return false;
      }
      return false;
    };
    return checkDir(dirPath);
  });

  ipcMain.handle('create-folder', async (_event, parentPath: string, folderName: string) => {
    try {
      if (!parentPath || typeof parentPath !== 'string') {
        return { success: false, error: 'Invalid parent path' };
      }
      
      if (!folderName || typeof folderName !== 'string') {
        return { success: false, error: 'Invalid folder name' };
      }
      
      const sanitizedName = folderName.replace(/[^a-zA-Z0-9\-]/g, '-');
      
      if (!isPathWithinNotesDir(parentPath, notesDir)) {
        log.error('Attempted to create folder outside notes directory:', parentPath);
        return { success: false, error: 'Access denied' };
      }
      
      const newPath = path.join(parentPath, sanitizedName);
      
      if (fs.existsSync(newPath)) {
        return { success: false, error: 'A folder with this name already exists' };
      }
      
      fs.mkdirSync(newPath, { recursive: true });
      return { success: true, path: newPath };
    } catch (e) {
      log.error('Error creating folder:', e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('rename-folder', async (_event, oldPath: string, newName: string) => {
    try {
      if (!oldPath || typeof oldPath !== 'string') {
        return { success: false, error: 'Invalid folder path' };
      }
      
      if (!newName || typeof newName !== 'string') {
        return { success: false, error: 'Invalid folder name' };
      }
      
      const sanitizedName = newName.replace(/[^a-zA-Z0-9\-]/g, '-');
      
      if (!isPathWithinNotesDir(oldPath, notesDir)) {
        log.error('Attempted to rename folder outside notes directory:', oldPath);
        return { success: false, error: 'Access denied' };
      }
      
      const dir = path.dirname(oldPath);
      const newPath = path.join(dir, sanitizedName);
      
      if (fs.existsSync(newPath) && newPath !== oldPath) {
        return { success: false, error: 'A folder with this name already exists' };
      }
      
      fs.renameSync(oldPath, newPath);
      return { success: true, newPath };
    } catch (e) {
      log.error('Error renaming folder:', e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('move-file', async (_event, sourcePath: string, destFolder: string) => {
    try {
      if (!sourcePath || typeof sourcePath !== 'string') {
        return { success: false, error: 'Invalid source path' };
      }
      
      if (!destFolder || typeof destFolder !== 'string') {
        return { success: false, error: 'Invalid destination folder' };
      }
      
      if (!isPathWithinNotesDir(sourcePath, notesDir)) {
        log.error('Attempted to move file outside notes directory:', sourcePath);
        return { success: false, error: 'Access denied' };
      }
      
      if (!isPathWithinNotesDir(destFolder, notesDir)) {
        log.error('Attempted to move file to outside notes directory:', destFolder);
        return { success: false, error: 'Access denied' };
      }
      
      const fileName = path.basename(sourcePath);
      let destPath = path.join(destFolder, fileName);
      
      if (fs.existsSync(destPath)) {
        const nameWithoutExt = fileName.replace(/\.md$/, '');
        let counter = 1;
        let newFileName = `${nameWithoutExt}-${counter}.md`;
        destPath = path.join(destFolder, newFileName);
        
        while (fs.existsSync(destPath)) {
          counter++;
          newFileName = `${nameWithoutExt}-${counter}.md`;
          destPath = path.join(destFolder, newFileName);
        }
      }
      
      fs.renameSync(sourcePath, destPath);
      return { success: true, newPath: destPath };
    } catch (e) {
      log.error('Error moving file:', e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('get-directory', async (_event, dirPath: string) => {
    try {
      if (!dirPath || typeof dirPath !== 'string') {
        return [];
      }
      
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      return entries
        .filter(entry => !entry.name.startsWith('.') && (entry.isDirectory() || entry.name.endsWith('.md')))
        .map(entry => {
          const fullPath = path.join(dirPath, entry.name);
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory()
          };
        })
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
    } catch (e) {
      log.error('Error reading directory:', e);
      return [];
    }
  });

  ipcMain.handle('read-file', async (_event, filePath: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return null;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const name = path.basename(filePath, '.md');
      const stats = fs.statSync(filePath);
      return {
        id: filePath,
        title: name,
        content: content,
        createdAt: stats.birthtimeMs,
        updatedAt: stats.mtimeMs
      };
    } catch (e) {
      log.error('Error reading file:', e);
      return null;
    }
  });
}