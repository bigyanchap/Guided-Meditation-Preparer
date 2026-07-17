import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url) as Promise<void>,
  netFetch: (req: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string | null;
  }) => ipcRenderer.invoke('electron-net-fetch', req),
});
