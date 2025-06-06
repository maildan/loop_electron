/**
 * Electron 메인 프로세스
 * TypeScript 엄격 모드 구현 - 포괄적인 오류 처리 및 향상된 디버깅
 */

// 환경변수 설정 및 초기 디버깅 (Electron 모듈 import 전에 설정)
const 개발모드 = process.env.NODE_ENV === 'development';
const 테스트모드 = process.env.NODE_ENV === 'test';
const CSP비활성화 = 개발모드 || process.env.DISABLE_CSP === 'true';
const 보안비활성화 = 개발모드 || process.env.DISABLE_SECURITY === 'true';
const 디버그레벨 = process.env.DEBUG_LEVEL || (개발모드 ? 'debug' : 'info');

// 타임스탬프와 함께 향상된 시작 로깅
const 시작시간 = new Date().toISOString();
console.log(`🚀 [${시작시간}] Electron 메인 프로세스 시작 중...`);
console.log(`📊 환경: ${process.env.NODE_ENV || 'production'}`);
console.log(`🔧 디버그 레벨: ${디버그레벨}`);
console.log(`🛡️ 보안 설정: { dev: ${개발모드}, disableSecurity: ${보안비활성화}, disableCSP: ${CSP비활성화} }`);
console.log(`💻 플랫폼: ${process.platform} ${process.arch}`);
console.log(`📝 Node 버전: ${process.version}`);
console.log(`⚡ Electron 버전: ${process.versions.electron || 'N/A'}`);
  
// 프로세스 메모리 및 성능 모니터링
const 프로세스상태 = {
  pid: process.pid,
  memory: process.memoryUsage(),
  cpuUsage: process.cpuUsage(),
  uptime: process.uptime()
};
console.log(`📈 프로세스 상태:`, JSON.stringify(프로세스상태, null, 2));

// 환경 변수 디버깅
if (개발모드) {
  const 관련환경변수들 = Object.keys(process.env)
    .filter(key => key.includes('ELECTRON') || key.includes('NODE') || key.includes('DEBUG'))
    .reduce((obj: Record<string, string>, key) => {
      obj[key] = process.env[key] || '';
      return obj;
    }, {});
  console.log(`🌍 관련 환경 변수들:`, JSON.stringify(관련환경변수들, null, 2));
}

// Electron 모듈 가져오기 전에 환경 변수 설정
if (보안비활성화 || CSP비활성화) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  process.env.ELECTRON_OVERRIDE_CSP = '*';
  console.log('🔓 개발 모드: Electron 보안 경고 비활성화됨');
}

import { app, BrowserWindow, ipcMain, Menu, nativeTheme, powerMonitor } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import Store from 'electron-store';
import DevToolsManager from './devtools';

// 보안 설정 모듈 import
const securityChecks = require('./security-checks');

// Type definitions
interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AppSettings {
  darkMode: boolean;
  windowMode: 'windowed' | 'fullscreen' | 'fullscreen-auto-hide';
  windowBounds: WindowBounds;
  useHardwareAcceleration: boolean;
  autoStart: boolean;
  enableAutoUpdates: boolean;
}

// Extend Store with proper typing
type ElectronStore = Store<AppSettings>;

interface DatabaseConfig {
  sqlitePath: string;
  mongoUri?: string;
  enableSync: boolean;
}

// Application state
class ElectronApp {
  private mainWindow: BrowserWindow | null = null;
  private store: ElectronStore;
  private isAppReady = false;
  private dbConfig: DatabaseConfig;
  private devTools: DevToolsManager | null = null;

  constructor() {
    // Initialize electron-store with strict typing
    this.store = new Store<AppSettings>({
      defaults: {
        darkMode: false,
        windowMode: 'windowed',
        windowBounds: { x: 100, y: 100, width: 1200, height: 800 },
        useHardwareAcceleration: true,
        autoStart: false,
        enableAutoUpdates: true,
      },
    });

    this.dbConfig = {
      sqlitePath: join(app.getPath('userData'), 'loop.db'),
      enableSync: false,
    };

    this.setupLogging();
    this.setupEventListeners();
    this.setupPowerMonitoring();
  }

  private setupLogging(): void {
    // 디버그 레벨과 함께 향상된 로깅 구성
    const 로그레벨 = 개발모드 ? 'debug' : 'info';
    
    log.transports.console.level = 로그레벨;
    log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
    
    log.transports.file.level = 'info';
    log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
    log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] [{processType}] {text}';
    
    // 향상된 컨텍스트와 함께 사용자 정의 로깅 함수 생성
    const createLogger = (level: string, originalFn: typeof console.log) => {
      return (...args: unknown[]) => {
        const timestamp = new Date().toISOString();
        const processInfo = `[PID:${process.pid}]`;
        const memoryUsage = `[MEM:${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB]`;
        
        if (개발모드) {
          originalFn(`${timestamp} ${processInfo} ${memoryUsage} [${level.toUpperCase()}]`, ...args);
        } else {
          originalFn(...args);
        }
        
        // electron-log에도 타입 안전하게 로그
        try {
          switch (level) {
            case 'info':
              log.info(...args);
              break;
            case 'warn':
              log.warn(...args);
              break;
            case 'error':
              log.error(...args);
              break;
            case 'debug':
              log.debug(...args);
              break;
            default:
              log.info(...args);
          }
        } catch (logError) {
          // electron-log 실패시 콘솔로 대체
          originalFn(`[로그_오류]`, ...args);
        }
      };
    };
    
    // 향상된 로깅으로 콘솔 메서드 오버라이드
    console.log = createLogger('info', console.log);
    console.warn = createLogger('warn', console.warn);
    console.error = createLogger('error', console.error);
    console.info = createLogger('info', console.info);
    console.debug = createLogger('debug', console.debug);

    // 시작 완료 로그
    console.log('🚀 Electron 메인 프로세스가 시작되었습니다');
    console.debug('📊 로깅 시스템이 초기화되었습니다. 레벨:', 로그레벨);
  }

  private setupEventListeners(): void {
    console.debug('🔧 Setting up application event listeners...');
    
    // App event listeners with enhanced debugging
    app.whenReady().then(() => {
      console.log('📱 Electron app is ready');
      this.onAppReady();
    });

    app.on('window-all-closed', () => {
      console.log('🪟 All windows closed');
      if (process.platform !== 'darwin') {
        console.log('💻 Non-macOS platform, quitting application');
        app.quit();
      } else {
        console.log('🍎 macOS platform, keeping app running');
      }
    });

    app.on('activate', () => {
      console.log('🔄 App activated');
      const windowCount = BrowserWindow.getAllWindows().length;
      console.debug(`Current window count: ${windowCount}`);
      
      if (windowCount === 0) {
        console.log('🆕 Creating new main window on activation');
        this.createMainWindow();
      }
    });

    // Handle deep links (for future use)
    app.setAsDefaultProtocolClient('loop');
    console.debug('🔗 Default protocol client set to "loop"');

    // Enhanced security: Prevent new window creation with detailed logging
    app.on('web-contents-created', (_, contents) => {
      console.debug('🌐 New web contents created, setting window open handler');
      
      contents.setWindowOpenHandler((details) => {
        console.warn('🚫 Blocked window open attempt:', {
          url: details.url,
          frameName: details.frameName,
          disposition: details.disposition
        });
        return { action: 'deny' };
      });
      
      // Log navigation attempts
      contents.on('will-navigate', (event, url) => {
        if (url !== contents.getURL()) {
          console.debug('🧭 Navigation attempt:', { from: contents.getURL(), to: url });
        }
      });
    });
    
    console.debug('✅ Event listeners setup complete');
  }

  private setupPowerMonitoring(): void {
    if (!powerMonitor) {
      console.warn('⚠️ Power monitor not available on this platform');
      return;
    }
    
    console.debug('🔋 Setting up power monitoring...');

    powerMonitor.on('suspend', () => {
      console.log('😴 시스템이 절전 모드로 전환됩니다');
      this.handlePowerEvent('suspend');
    });

    powerMonitor.on('resume', () => {
      console.log('👁️ 시스템이 절전 모드에서 복원되었습니다');
      this.handlePowerEvent('resume');
    });

    powerMonitor.on('on-battery', () => {
      console.log('🔋 시스템이 배터리 전원으로 작동 중입니다');
      this.handlePowerEvent('battery');
    });

    powerMonitor.on('on-ac', () => {
      console.log('🔌 시스템이 AC 전원으로 작동 중입니다');
      this.handlePowerEvent('ac');
    });
    
    console.debug('✅ Power monitoring setup complete');
  }

  private async onAppReady(): Promise<void> {
    const startTime = Date.now();
    console.log('🚀 App ready handler starting...');
    
    try {
      this.isAppReady = true;
      console.debug('✅ App ready state set to true');
      
      // 보안 설정 초기화 with enhanced error handling
      try {
        console.log('🛡️ 보안 설정 초기화 중...');
        const securityStartTime = Date.now();
        
        const securityResult = securityChecks.initializeSecuritySettings(app);
        const securityDuration = Date.now() - securityStartTime;
        
        console.log(`✅ 보안 설정 초기화 결과: ${securityResult} (소요시간: ${securityDuration}ms)`);
      } catch (securityError) {
        console.error('❌ 보안 설정 초기화 오류:', {
          error: securityError,
          message: securityError instanceof Error ? securityError.message : 'Unknown error',
          stack: securityError instanceof Error ? securityError.stack : 'No stack trace'
        });
      }
      
      // Initialize database with performance monitoring
      console.log('🗄️ Initializing database...');
      const dbStartTime = Date.now();
      await this.initializeDatabase();
      const dbDuration = Date.now() - dbStartTime;
      console.log(`✅ Database initialization complete (소요시간: ${dbDuration}ms)`);
      
      // Create main window
      await this.createMainWindow();
      
      // Setup IPC handlers
      this.setupIpcHandlers();
      
      // Setup application menu
      this.setupApplicationMenu();
      
      // Setup auto-updater
      this.setupAutoUpdater();
      
      // Apply hardware acceleration setting
      this.applyHardwareAcceleration();
      
      log.info('✅ Electron 앱이 완전히 초기화되었습니다');
    } catch (error) {
      log.error('❌ Electron 앱 초기화에 실패했습니다:', error);
      app.quit();
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Import database module dynamically
      const { initializeDatabase, sqliteManager } = await import('./database/sqlite-manager');
      await initializeDatabase(this.dbConfig.sqlitePath);
      
      // Initialize MongoDB sync if enabled
      if (this.dbConfig.enableSync && this.dbConfig.mongoUri) {
        const MongoDBSyncModule = await import('./database/mongodb-sync');
        const mongoSync = new MongoDBSyncModule.MongoDBSyncManager(sqliteManager);
        await mongoSync.initialize();
      }
      
      log.info('✅ 데이터베이스가 성공적으로 초기화되었습니다');
    } catch (error) {
      log.error('❌ 데이터베이스 초기화에 실패했습니다:', error);
      throw error;
    }
  }

  private async createMainWindow(): Promise<void> {
    const bounds = this.store.get('windowBounds');
    
    this.mainWindow = new BrowserWindow({
      ...bounds,
      title: 'loop', // 앱 타이틀 설정
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
        spellcheck: false,
        webSecurity: !개발모드, // 개발 모드에서는 웹 보안 비활성화
        allowRunningInsecureContent: 개발모드, // 개발 모드에서는 안전하지 않은 컨텐츠 허용
        devTools: true,
        // 브라우저 기능을 비활성화하여 Autofill 관련 경고 방지
        enableWebSQL: false,
        autoplayPolicy: 'user-gesture-required',
        webgl: false,
        plugins: false,
        // 개발 모드에서 추가 설정
        ...(개발모드 ? {
          disableDialogs: false,           // 개발 중 대화 상자 허용
          experimentalFeatures: true,      // 실험적 기능 허용
        } : {}),
      },
      frame: true, // Use native window frame with OS controls
      titleBarStyle: 'default', // Use default OS titlebar
      show: false, // Don't show until ready
    });

    // Load the app
    if (개발모드) {
      const devPort = process.env.NEXT_DEV_PORT || (process.env.NODE_ENV === 'test' ? '3002' : '3001');
      const devUrl = `http://localhost:${devPort}`;
      log.info(`개발 모드: ${devUrl}로 페이지를 로드합니다`);
      
      try {
        await this.mainWindow.loadURL(devUrl);
        log.info('✅ 개발 서버 페이지 로드 완료');
      } catch (loadError) {
        log.error('❌ 개발 서버 페이지 로드 실패:', loadError);
        // 백업: 로컬 HTML 파일 로드 시도
        try {
          await this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
          log.info('백업: 로컬 HTML 파일 로드 완료');
        } catch (backupError) {
          log.error('백업 로드도 실패:', backupError);
        }
      }
      
      // 개발자 도구 관리자 초기화
      this.devTools = new DevToolsManager(this.mainWindow, {
        mode: 'detach',
        suppressWarnings: true,
        closeOnWindowClose: true
      });
      
      // 즉시 개발자 도구 열기 (디버깅용)
      setTimeout(() => {
        log.info('즉시 개발자 도구를 엽니다');
        this.devTools?.open();
      }, 100);
      
      // 페이지 로드 완료 후 개발자 도구 열기 (여러 이벤트로 대응)
      this.mainWindow.webContents.once('did-finish-load', () => {
        log.info('페이지 로드 완료 (did-finish-load), 개발자 도구를 엽니다');
        setTimeout(() => {
          this.devTools?.open();
        }, 500); // 약간의 지연 후 열기
      });
      
      // 백업: DOM 준비 완료 후에도 시도
      this.mainWindow.webContents.once('dom-ready', () => {
        log.info('DOM 준비 완료 (dom-ready), 개발자 도구를 엽니다');
        setTimeout(() => {
          if (!this.devTools || !this.devTools.isOpen()) {
            this.devTools?.open();
          }
        }, 1000);
      });
      
    } else {
      await this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      if (!this.mainWindow) return;
      
      log.info('🖥️ 메인 창을 표시합니다');
      this.mainWindow.show();
      this.mainWindow.focus(); // Ensure window gets focus
      
      // Apply window mode
      const windowMode = this.store.get('windowMode');
      this.applyWindowMode(windowMode);
      
      log.info('✅ 메인 창이 성공적으로 표시되었습니다');
    });

    // Save window bounds on close
    this.mainWindow.on('close', () => {
      if (!this.mainWindow) return;
      
      const bounds = this.mainWindow.getBounds();
      this.store.set('windowBounds', bounds);
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    log.info('✅ 메인 창이 생성되었습니다');
  }

  private setupIpcHandlers(): void {
    // Settings management
    ipcMain.handle('get-settings', () => {
      return this.store.store;
    });

    ipcMain.handle('set-setting', (_, key: keyof AppSettings, value: any) => {
      this.store.set(key, value);
      return true;
    });

    ipcMain.handle('get-setting', (_, key: keyof AppSettings) => {
      return this.store.get(key);
    });

    // Window management
    ipcMain.handle('window-minimize', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('window-maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.handle('window-close', () => {
      this.mainWindow?.close();
    });

    ipcMain.handle('window-is-maximized', () => {
      return this.mainWindow?.isMaximized() ?? false;
    });
    
    // 개발자 도구 제어
    ipcMain.handle('toggle-devtools', () => {
      if (this.devTools) {
        this.devTools.toggle();
        return true;
      } else if (this.mainWindow) {
        if (this.mainWindow.webContents.isDevToolsOpened()) {
          this.mainWindow.webContents.closeDevTools();
        } else {
          this.mainWindow.webContents.openDevTools({ mode: 'detach' });
        }
        return true;
      }
      return false;
    });

    // Dark mode
    ipcMain.handle('set-dark-mode', (_, enabled: boolean) => {
      nativeTheme.themeSource = enabled ? 'dark' : 'light';
      this.store.set('darkMode', enabled);
      return true;
    });

    ipcMain.handle('get-dark-mode', () => {
      return this.store.get('darkMode');
    });

    // Window mode
    ipcMain.handle('set-window-mode', (_, mode: AppSettings['windowMode']) => {
      this.store.set('windowMode', mode);
      this.applyWindowMode(mode);
      return true;
    });

    // System info
    ipcMain.handle('get-system-info', () => ({
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
    }));

    // GPU info
    ipcMain.handle('get-gpu-info', async () => {
      try {
        const info = await app.getGPUInfo('complete');
        return info;
      } catch (error) {
        log.error('❌ GPU 정보 가져오기에 실패했습니다:', error);
        return null;
      }
    });

    // Performance monitoring
    ipcMain.handle('get-memory-info', () => {
      return process.getSystemMemoryInfo();
    });

    ipcMain.handle('trigger-gc', () => {
      if (global.gc) {
        global.gc();
        return true;
      }
      return false;
    });

    log.info('✅ IPC 핸들러가 등록되었습니다');
  }

  private setupApplicationMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.mainWindow?.webContents.send('navigate-to-settings');
            },
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
        ],
      },
    ];

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupAutoUpdater(): void {
    if (!개발모드 && this.store.get('enableAutoUpdates')) {
      autoUpdater.checkForUpdatesAndNotify();
      
      autoUpdater.on('update-available', () => {
        this.mainWindow?.webContents.send('update-available');
      });

      autoUpdater.on('update-downloaded', () => {
        this.mainWindow?.webContents.send('update-downloaded');
      });
    }
  }

  private applyHardwareAcceleration(): void {
    const useHardwareAcceleration = this.store.get('useHardwareAcceleration');
    if (!useHardwareAcceleration) {
      app.disableHardwareAcceleration();
      log.info('⚡ 하드웨어 가속이 비활성화되었습니다');
    }
  }

  private applyWindowMode(mode: AppSettings['windowMode']): void {
    if (!this.mainWindow) return;

    switch (mode) {
      case 'fullscreen':
        this.mainWindow.setFullScreen(true);
        break;
      case 'fullscreen-auto-hide':
        this.mainWindow.setFullScreen(true);
        this.mainWindow.setMenuBarVisibility(false);
        break;
      case 'windowed':
      default:
        this.mainWindow.setFullScreen(false);
        this.mainWindow.setMenuBarVisibility(true);
        break;
    }
  }

  private handlePowerEvent(event: 'suspend' | 'resume' | 'battery' | 'ac'): void {
    this.mainWindow?.webContents.send('power-event', event);
  }
}

// Initialize the application
const electronApp = new ElectronApp();

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  log.error('❌ 예외 처리되지 않은 오류:', error);
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('❌ 처리되지 않은 Promise 거부:', promise, '이유:', reason);
});

export default electronApp;
