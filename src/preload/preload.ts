/**
 * Electron 프리로드 스크립트
 * 메인 프로세스와 렌더러 프로세스 간의 안전한 브리지
 */

import { contextBridge, ipcRenderer } from 'electron';

// 렌더러에 노출될 API 인터페이스 정의
export interface ElectronAPI {
  // 설정 관리
  getSettings: () => Promise<any>;
  setSetting: (key: string, value: any) => Promise<boolean>;
  getSetting: (key: string) => Promise<any>;

  // 윈도우 관리
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  toggleDevTools: () => Promise<boolean>;

  // 테마 관리
  setDarkMode: (enabled: boolean) => Promise<boolean>;
  getDarkMode: () => Promise<boolean>;
  setWindowMode: (mode: string) => Promise<boolean>;

  // 시스템 정보
  getSystemInfo: () => Promise<{
    platform: string;
    arch: string;
    version: string;
    electronVersion: string;
    nodeVersion: string;
  }>;

  // GPU and performance
  getGpuInfo: () => Promise<any>;
  getMemoryInfo: () => Promise<any>;
  triggerGC: () => Promise<boolean>;

  // Database operations
  executeQuery: (query: string, params?: any[]) => Promise<any>;
  saveTypingStats: (stats: any) => Promise<boolean>;
  getTypingLogs: (limit?: number) => Promise<any[]>;

  // File operations
  selectFile: (options?: any) => Promise<string | null>;
  saveFile: (path: string, data: any) => Promise<boolean>;
  readFile: (path: string) => Promise<string | null>;

  // Event handling
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
}

// Create the API object
const electronAPI: ElectronAPI = {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('set-setting', key, value),
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),

  // Window management
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),

  // Theme management
  setDarkMode: (enabled: boolean) => ipcRenderer.invoke('set-dark-mode', enabled),
  getDarkMode: () => ipcRenderer.invoke('get-dark-mode'),
  setWindowMode: (mode: string) => ipcRenderer.invoke('set-window-mode', mode),

  // System information
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // GPU and performance
  getGpuInfo: () => ipcRenderer.invoke('get-gpu-info'),
  getMemoryInfo: () => ipcRenderer.invoke('get-memory-info'),
  triggerGC: () => ipcRenderer.invoke('trigger-gc'),

  // Database operations
  executeQuery: (query: string, params?: any[]) => ipcRenderer.invoke('db-execute-query', query, params),
  saveTypingStats: (stats: any) => ipcRenderer.invoke('db-save-typing-stats', stats),
  getTypingLogs: (limit?: number) => ipcRenderer.invoke('db-get-typing-logs', limit),

  // File operations
  selectFile: (options?: any) => ipcRenderer.invoke('file-select', options),
  saveFile: (path: string, data: any) => ipcRenderer.invoke('file-save', path, data),
  readFile: (path: string) => ipcRenderer.invoke('file-read', path),

  // Event handling
  on: (channel: string, callback: (...args: any[]) => void) => {
    // Whitelist of allowed channels for security
    const allowedChannels = [
      'navigate-to-settings',
      'update-available',
      'update-downloaded',
      'power-event',
      'typing-stats-updated',
      'database-sync-status',
      'performance-warning',
    ];

    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    } else {
      console.warn(`Channel "${channel}" is not in the whitelist`);
    }
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  send: (channel: string, ...args: any[]) => {
    // Whitelist of allowed channels for security
    const allowedChannels = [
      'typing-event',
      'settings-changed',
      'request-sync',
      'performance-data',
    ];

    if (allowedChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    } else {
      console.warn(`Channel "${channel}" is not in the whitelist`);
    }
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Also expose for compatibility
contextBridge.exposeInMainWorld('electron', electronAPI);

// Expose some Node.js globals for compatibility
contextBridge.exposeInMainWorld('process', {
  platform: process.platform,
  versions: process.versions,
});

// Security: Remove dangerous globals in production
if (process.env.NODE_ENV === 'production') {
  delete (global as any).Buffer;
  delete (global as any).process;
  delete (global as any).require;
}

console.log('✅ Preload script loaded successfully');
