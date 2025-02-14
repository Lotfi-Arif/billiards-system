import { ElectronAPI } from "../shared/types/electronAPI";

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
