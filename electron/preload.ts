import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload minimal loading...');

contextBridge.exposeInMainWorld('electronAPI', {
  test: () => 'test works!',
  selectNotesFolder: () => ipcRenderer.invoke('select-notes-folder'),
  getNotes: () => ipcRenderer.invoke('get-notes'),
  saveNote: (note: unknown) => ipcRenderer.invoke('save-note', note),
  deleteNote: (id: string) => ipcRenderer.invoke('delete-note', id),
  getNotesFolder: () => ipcRenderer.invoke('get-notes-folder'),
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
