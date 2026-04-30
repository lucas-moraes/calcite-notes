"use strict";
const electron = require("electron");
console.log("Preload minimal loading...");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  test: () => "test works!",
  selectNotesFolder: () => electron.ipcRenderer.invoke("select-notes-folder"),
  getNotes: () => electron.ipcRenderer.invoke("get-notes"),
  saveNote: (note) => electron.ipcRenderer.invoke("save-note", note),
  deleteNote: (id) => electron.ipcRenderer.invoke("delete-note", id),
  deleteFolder: (path) => electron.ipcRenderer.invoke("delete-folder", path),
  getNotesFolder: () => electron.ipcRenderer.invoke("get-notes-folder"),
  getDirectory: (path) => electron.ipcRenderer.invoke("get-directory", path),
  readFile: (path) => electron.ipcRenderer.invoke("read-file", path),
  hasMdFiles: (path) => electron.ipcRenderer.invoke("has-md-files", path),
  saveNewNote: (path, content) => electron.ipcRenderer.invoke("save-new-note", path, content),
  renameNote: (oldPath, newFileName) => electron.ipcRenderer.invoke("rename-note", oldPath, newFileName),
  createFolder: (parentPath, folderName) => electron.ipcRenderer.invoke("create-folder", parentPath, folderName),
  renameFolder: (oldPath, newName) => electron.ipcRenderer.invoke("rename-folder", oldPath, newName),
  moveFile: (sourcePath, destFolder) => electron.ipcRenderer.invoke("move-file", sourcePath, destFolder),
  getTheme: () => electron.ipcRenderer.invoke("get-theme"),
  saveTheme: (theme) => electron.ipcRenderer.invoke("save-theme", theme),
  getTreeWidth: () => electron.ipcRenderer.invoke("get-tree-width"),
  saveTreeWidth: (width) => electron.ipcRenderer.invoke("save-tree-width", width),
  onNewNote: (callback) => {
    electron.ipcRenderer.on("menu:new-note", callback);
    return () => electron.ipcRenderer.removeListener("menu:new-note", callback);
  },
  onReloadNotes: (callback) => {
    electron.ipcRenderer.on("reload-notes", callback);
    return () => electron.ipcRenderer.removeListener("reload-notes", callback);
  }
});
console.log("Preload done");
