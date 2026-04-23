import { contextBridge, ipcRenderer } from "electron";
console.log("Preload minimal loading...");
contextBridge.exposeInMainWorld("electronAPI", {
  test: () => "test works!",
  selectNotesFolder: () => ipcRenderer.invoke("select-notes-folder"),
  getNotes: () => ipcRenderer.invoke("get-notes"),
  saveNote: (note) => ipcRenderer.invoke("save-note", note),
  deleteNote: (id) => ipcRenderer.invoke("delete-note", id),
  getNotesFolder: () => ipcRenderer.invoke("get-notes-folder"),
  getDirectory: (path) => ipcRenderer.invoke("get-directory", path),
  readFile: (path) => ipcRenderer.invoke("read-file", path),
  hasMdFiles: (path) => ipcRenderer.invoke("has-md-files", path),
  saveNewNote: (path, content) => ipcRenderer.invoke("save-new-note", path, content),
  getTheme: () => ipcRenderer.invoke("get-theme"),
  saveTheme: (theme) => ipcRenderer.invoke("save-theme", theme),
  onNewNote: (callback) => {
    ipcRenderer.on("menu:new-note", callback);
    return () => ipcRenderer.removeListener("menu:new-note", callback);
  },
  onReloadNotes: (callback) => {
    ipcRenderer.on("reload-notes", callback);
    return () => ipcRenderer.removeListener("reload-notes", callback);
  }
});
console.log("Preload done");
