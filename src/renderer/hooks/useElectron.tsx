import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Define types for the Electron API
interface ElectronAPI {
  // Database operations
  database: {
    insertTypingLog: (log: TypingLogEntry) => Promise<void>;
    getTypingLogs: (limit?: number) => Promise<TypingLogEntry[]>;
    updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
    getSettings: () => Promise<UserSettings | null>;
    getTypingStats: () => Promise<TypingStatsEntry[]>;
    updateTypingStats: (stats: TypingStatsEntry) => Promise<void>;
  };

  // System operations
  system: {
    getSystemInfo: () => Promise<SystemInfo>;
    getMemoryUsage: () => Promise<MemoryUsage>;
    getPlatform: () => Promise<string>;
    getVersion: () => Promise<string>;
  };

  // Window operations
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    unmaximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    toggleFullScreen: () => Promise<void>;
    isFullScreen: () => Promise<boolean>;
  };

  // Native operations
  native: {
    initializeGpu: () => Promise<boolean>;
    processTypingDataGpu: (data: TypingEvent[]) => Promise<TypingAnalysis>;
    processTypingDataCpu: (data: TypingEvent[]) => Promise<TypingAnalysis>;
    getSystemInfo: () => Promise<SystemInfo>;
    getMemoryUsage: () => Promise<MemoryUsage>;
    getGpuInfo: () => Promise<GpuInfo | null>;
    optimizeMemory: () => Promise<MemoryOptimizationResult>;
    startPerformanceMonitoring: (intervalMs: number) => Promise<void>;
    stopPerformanceMonitoring: () => Promise<void>;
    getPerformanceMetrics: () => Promise<PerformanceMetrics>;
  };

  // IME keyboard operations
  ime: {
    registerListener: (eventType: string) => Promise<{ success: boolean; error?: string }>;
    unregisterListener: (eventType: string) => Promise<{ success: boolean; error?: string }>;
    getIMEStatus: () => Promise<any>;
    requestPermissions: () => Promise<{ success: boolean; permissions: IMEPermissions; error?: string }>;
    checkPermissions: () => Promise<{ success: boolean; permissions: IMEPermissions }>;
    registerGlobalShortcut: (accelerator: string, action: string) => Promise<{ success: boolean; error?: string }>;
    unregisterGlobalShortcut: (accelerator: string) => Promise<{ success: boolean; error?: string }>;
    getKeyboardLayout: () => Promise<{ success: boolean; layout?: any; error?: string }>;
    setIMEMode: (mode: string) => Promise<{ success: boolean; error?: string }>;
  };

  // Developer tools
  toggleDevTools: () => Promise<void>;

  // System utilities
  send?: (channel: string, ...args: any[]) => void;
  getMemoryInfo?: () => Promise<{ total: number; free: number }>;
  triggerGC?: () => Promise<boolean>;

  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => void;
  removeListener: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

// Type definitions
interface TypingLogEntry {
  id?: string;
  sessionId: string;
  text: string;
  timestamp: number;
  wpm: number;
  accuracy: number;
  errors: number;
  corrections: number;
}

interface TypingStatsEntry {
  id?: string;
  date: string;
  totalSessions: number;
  totalTime: number;
  averageWpm: number;
  averageAccuracy: number;
  bestWpm: number;
  bestAccuracy: number;
}

interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
  soundEnabled: boolean;
  autoSave: boolean;
  language: string;
  keyboardLayout: string;
  practiceMode: string;
  targetWpm: number;
  showLiveWpm: boolean;
  showLiveAccuracy: boolean;
  enableGpuAcceleration: boolean;
  monitorPerformance: boolean;
}

interface SystemInfo {
  platform: string;
  arch: string;
  cpuCount: number;
  memoryTotal: number;
  uptime: number;
}

interface MemoryUsage {
  used: number;
  total: number;
  available: number;
  percentage: number;
}

interface TypingEvent {
  text: string;
  durationMs: number;
  backspaces: number;
  corrections: number;
  timestamp: number;
}

interface TypingAnalysis {
  averageWpm: number;
  averageAccuracy: number;
  totalErrors: number;
  totalEvents: number;
  patternAnalysis: PatternAnalysis;
  recommendations: string[];
}

interface PatternAnalysis {
  commonChars: Array<[string, number]>;
  commonBigrams: Array<[string, number]>;
  errorPatterns: Array<[string, number]>;
}

interface GpuInfo {
  name: string;
  vendor: string;
  deviceType: string;
  backend: string;
}

interface MemoryOptimizationResult {
  memoryFreed: number;
  buffersCleaned: number;
  currentMemoryUsage: number;
  optimizationSuccess: boolean;
}

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: number;
  gpuUsage: number;
  temperature: number;
  timestamp: number;
}

interface IMEPermissions {
  keyboardAccess: boolean;
  globalShortcuts: boolean;
  inputMonitoring: boolean;
  accessibilityAPI: boolean;
}

// Declare global electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Context for Electron API
const ElectronContext = createContext<ElectronAPI | null>(null);

// Provider component
interface ElectronProviderProps {
  children: ReactNode;
}

export const ElectronProvider: React.FC<ElectronProviderProps> = ({ children }) => {
  const [api, setApi] = useState<ElectronAPI | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setApi(window.electronAPI);
    }
  }, []);

  return (
    <ElectronContext.Provider value={api}>
      {children}
    </ElectronContext.Provider>
  );
};

// Hook to use Electron API
export const useElectron = (): ElectronAPI | null => {
  return useContext(ElectronContext);
};

// Hook for database operations
export const useDatabase = () => {
  const electron = useElectron();
  
  return {
    insertTypingLog: async (log: TypingLogEntry) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.database.insertTypingLog(log);
    },
    
    getTypingLogs: async (limit?: number) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.database.getTypingLogs(limit);
    },
    
    updateSettings: async (settings: Partial<UserSettings>) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.database.updateSettings(settings);
    },
    
    getSettings: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.database.getSettings();
    },
    
    getTypingStats: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.database.getTypingStats();
    },
    
    updateTypingStats: async (stats: TypingStatsEntry) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.database.updateTypingStats(stats);
    },
  };
};

// Hook for system operations
export const useSystem = () => {
  const electron = useElectron();
  
  return {
    getSystemInfo: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.system.getSystemInfo();
    },
    
    getMemoryUsage: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.system.getMemoryUsage();
    },
    
    getPlatform: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.system.getPlatform();
    },
    
    getVersion: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.system.getVersion();
    },
  };
};

// Hook for window operations
export const useWindow = () => {
  const electron = useElectron();
  
  return {
    minimize: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.window.minimize();
    },
    
    maximize: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.window.maximize();
    },
    
    unmaximize: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.window.unmaximize();
    },
    
    close: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.window.close();
    },
    
    isMaximized: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.window.isMaximized();
    },
    
    toggleFullScreen: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.window.toggleFullScreen();
    },
    
    isFullScreen: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.window.isFullScreen();
    },
  };
};

// Hook for native operations
export const useNative = () => {
  const electron = useElectron();
  
  return {
    initializeGpu: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.native.initializeGpu();
    },
    
    processTypingDataGpu: async (data: TypingEvent[]) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.native.processTypingDataGpu(data);
    },
    
    processTypingDataCpu: async (data: TypingEvent[]) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.native.processTypingDataCpu(data);
    },
    
    getSystemInfo: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.native.getSystemInfo();
    },
    
    getMemoryUsage: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.native.getMemoryUsage();
    },
    
    getGpuInfo: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.native.getGpuInfo();
    },
    
    optimizeMemory: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.native.optimizeMemory();
    },
    
    startPerformanceMonitoring: async (intervalMs: number) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.native.startPerformanceMonitoring(intervalMs);
    },
    
    stopPerformanceMonitoring: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.native.stopPerformanceMonitoring();
    },
    
    getPerformanceMetrics: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.native.getPerformanceMetrics();
    },
  };
};

// Hook for IME operations
export const useIME = () => {
  const electron = useElectron();
  
  return {
    registerListener: async (eventType: string) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.ime.registerListener(eventType);
    },
    
    unregisterListener: async (eventType: string) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.ime.unregisterListener(eventType);
    },
    
    getIMEStatus: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.ime.getIMEStatus();
    },
    
    requestPermissions: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.ime.requestPermissions();
    },
    
    checkPermissions: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.ime.checkPermissions();
    },
    
    registerGlobalShortcut: async (accelerator: string, action: string) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.ime.registerGlobalShortcut(accelerator, action);
    },
    
    unregisterGlobalShortcut: async (accelerator: string) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.ime.unregisterGlobalShortcut(accelerator);
    },
    
    getKeyboardLayout: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.ime.getKeyboardLayout();
    },
    
    setIMEMode: async (mode: string) => {
      if (!electron) throw new Error('Electron API not available');
      return electron.ime.setIMEMode(mode);
    },
  };
};

// Hook for developer tools
export const useDevTools = () => {
  const electron = useElectron();
  
  return {
    toggleDevTools: async () => {
      if (!electron) throw new Error('Electron API not available');
      return electron.toggleDevTools();
    },
  };
};

// Export types for use in other components
export type {
  ElectronAPI,
  TypingLogEntry,
  TypingStatsEntry,
  UserSettings,
  SystemInfo,
  MemoryUsage,
  TypingEvent,
  TypingAnalysis,
  PatternAnalysis,
  GpuInfo,
  MemoryOptimizationResult,
  PerformanceMetrics,
  IMEPermissions,
};
