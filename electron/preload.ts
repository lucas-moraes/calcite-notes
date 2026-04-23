import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload minimal loading...');

contextBridge.exposeInMainWorld('electronAPI', {
  test: () => 'test works!',
  selectNotesFolder: () => ipcRenderer.invoke('select-notes-folder'),
  getNotes: () => ipcRenderer.invoke('get-notes'),
  saveNote: (note: unknown) => ipcRenderer.invoke('save-note', note),
  deleteNote: (id: string) => ipcRenderer.invoke('delete-note', id),
  getNotesFolder: () => ipcRenderer.invoke('get-notes-folder'),
  getDirectory: (path: string) => ipcRenderer.invoke('get-directory', path),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  hasMdFiles: (path: string) => ipcRenderer.invoke('has-md-files', path),
  saveNewNote: (path: string, content: string) => ipcRenderer.invoke('save-new-note', path, content),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  saveTheme: (theme: 'dark' | 'light') => ipcRenderer.invoke('save-theme', theme),
  onNewNote: (callback: () => void) => {
    ipcRenderer.on('menu:new-note', callback);
    return () => ipcRenderer.removeListener('menu:new-note', callback);
  },
  onReloadNotes: (callback: () => void) => {
    ipcRenderer.on('reload-notes', callback);
    return () => ipcRenderer.removeListener('reload-notes', callback);
  }
});

console.log('Preload done');
