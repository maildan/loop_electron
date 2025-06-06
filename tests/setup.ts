import 'jest';

// Mock Electron APIs for testing
const mockElectron = {
  app: {
    getPath: jest.fn((name: string) => `/mock/path/${name}`),
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(),
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
      on: jest.fn(),
    },
    show: jest.fn(),
    close: jest.fn(),
  })),
  contextBridge: {
    exposeInMainWorld: jest.fn(),
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  },
};

// Mock better-sqlite3
const mockDatabase = {
  prepare: jest.fn(() => ({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
  })),
  exec: jest.fn(),
  close: jest.fn(),
};

jest.mock('electron', () => mockElectron);
jest.mock('better-sqlite3', () => jest.fn(() => mockDatabase));
jest.mock('electron-log', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});

// Add global types for testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
