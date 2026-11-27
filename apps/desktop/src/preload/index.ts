import { contextBridge } from 'electron';

/** The only bridge between the page and the system. Will grow with screen capture and input. */
const api = {
  platform: process.platform,
};

contextBridge.exposeInMainWorld('remora', api);

export type RemoraApi = typeof api;
