import { ipcMain, app, BrowserWindow } from 'electron';
import { globalShortcut } from 'electron';
import log from 'electron-log';

export interface IMEKeyboardEvent {
  type: 'keydown' | 'keyup' | 'compositionstart' | 'compositionupdate' | 'compositionend';
  key: string;
  code: string;
  composition?: {
    data: string;
    isComposing: boolean;
    selectionStart: number;
    selectionEnd: number;
  };
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
  timestamp: number;
  inputSource: 'physical' | 'ime' | 'virtual';
}

export interface IMEPermissions {
  keyboardAccess: boolean;
  globalShortcuts: boolean;
  inputMonitoring: boolean;
  accessibilityAPI: boolean;
}

export class IMEKeyboardManager {
  private mainWindow: BrowserWindow | null = null;
  private globalShortcutsRegistered = false;
  private keyboardListeners: Map<string, Function[]> = new Map();
  private permissions: IMEPermissions = {
    keyboardAccess: false,
    globalShortcuts: false,
    inputMonitoring: false,
    accessibilityAPI: false,
  };

  constructor() {
    this.setupIpcHandlers();
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    this.setupWindowKeyboardHandlers();
  }

  private setupIpcHandlers(): void {
    // Register keyboard event listener
    ipcMain.handle('ime-keyboard:register-listener', async (event, eventType: string) => {
      try {
        return await this.registerKeyboardListener(eventType);
      } catch (error: unknown) {
        log.error('Failed to register keyboard listener:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Unregister keyboard event listener
    ipcMain.handle('ime-keyboard:unregister-listener', async (event, eventType: string) => {
      try {
        return await this.unregisterKeyboardListener(eventType);
      } catch (error: unknown) {
        log.error('Failed to unregister keyboard listener:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Get IME status
    ipcMain.handle('ime-keyboard:get-ime-status', async () => {
      try {
        return await this.getIMEStatus();
      } catch (error: unknown) {
        log.error('Failed to get IME status:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Request permissions
    ipcMain.handle('ime-keyboard:request-permissions', async () => {
      try {
        return await this.requestPermissions();
      } catch (error: unknown) {
        log.error('Failed to request permissions:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Check permissions
    ipcMain.handle('ime-keyboard:check-permissions', async () => {
      try {
        return await this.checkPermissions();
      } catch (error: unknown) {
        log.error('Failed to check permissions:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Register global shortcut
    ipcMain.handle('ime-keyboard:register-global-shortcut', async (event, accelerator: string, action: string) => {
      try {
        return await this.registerGlobalShortcut(accelerator, action);
      } catch (error: unknown) {
        log.error('Failed to register global shortcut:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Unregister global shortcut
    ipcMain.handle('ime-keyboard:unregister-global-shortcut', async (event, accelerator: string) => {
      try {
        return await this.unregisterGlobalShortcut(accelerator);
      } catch (error: unknown) {
        log.error('Failed to unregister global shortcut:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Get keyboard layout
    ipcMain.handle('ime-keyboard:get-keyboard-layout', async () => {
      try {
        return await this.getKeyboardLayout();
      } catch (error: unknown) {
        log.error('Failed to get keyboard layout:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Set IME mode
    ipcMain.handle('ime-keyboard:set-ime-mode', async (event, mode: string) => {
      try {
        return await this.setIMEMode(mode);
      } catch (error: unknown) {
        log.error('Failed to set IME mode:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
  }

  private setupWindowKeyboardHandlers(): void {
    if (!this.mainWindow) return;

    // Handle window focus events for IME context
    this.mainWindow.on('focus', () => {
      this.handleWindowFocus();
    });

    this.mainWindow.on('blur', () => {
      this.handleWindowBlur();
    });

    // Setup web contents keyboard handlers
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      this.handleBeforeInputEvent(event, input);
    });

    this.mainWindow.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });
  }

  private async registerKeyboardListener(eventType: string): Promise<{ success: boolean; error?: string }> {
    if (!this.permissions.keyboardAccess) {
      return { success: false, error: 'Keyboard access permission not granted' };
    }

    const listeners = this.keyboardListeners.get(eventType) || [];
    
    const listener = (event: any) => {
      const imeEvent: IMEKeyboardEvent = {
        type: event.type as any,
        key: event.key || '',
        code: event.code || '',
        composition: event.composition ? {
          data: event.composition.data || '',
          isComposing: event.composition.isComposing || false,
          selectionStart: event.composition.selectionStart || 0,
          selectionEnd: event.composition.selectionEnd || 0,
        } : undefined,
        modifiers: {
          shift: event.shiftKey || false,
          ctrl: event.ctrlKey || false,
          alt: event.altKey || false,
          meta: event.metaKey || false,
        },
        timestamp: Date.now(),
        inputSource: this.detectInputSource(event),
      };

      // Send to renderer process
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('ime-keyboard:event', imeEvent);
      }
    };

    listeners.push(listener);
    this.keyboardListeners.set(eventType, listeners);

    log.info(`Registered keyboard listener for event type: ${eventType}`);
    return { success: true };
  }

  private async unregisterKeyboardListener(eventType: string): Promise<{ success: boolean; error?: string }> {
    this.keyboardListeners.delete(eventType);
    log.info(`Unregistered keyboard listener for event type: ${eventType}`);
    return { success: true };
  }

  private detectInputSource(event: any): 'physical' | 'ime' | 'virtual' {
    // Detect if input comes from IME, physical keyboard, or virtual keyboard
    if (event.composition || event.isComposing) {
      return 'ime';
    }
    
    if (event.isTrusted === false) {
      return 'virtual';
    }
    
    return 'physical';
  }

  private handleBeforeInputEvent(event: Electron.Event, input: Electron.Input): void {
    const imeEvent: IMEKeyboardEvent = {
      type: input.type as any,
      key: input.key || '',
      code: input.code || '',
      modifiers: {
        shift: !!input.shift,
        ctrl: !!input.control,
        alt: !!input.alt,
        meta: !!input.meta,
      },
      timestamp: Date.now(),
      inputSource: 'physical',
    };

    // Forward to renderer process
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('ime-keyboard:before-input', imeEvent);
    }
  }

  private handleWindowFocus(): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('ime-keyboard:window-focus');
      log.debug('Window focused - IME context activated');
    }
  }

  private handleWindowBlur(): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('ime-keyboard:window-blur');
      log.debug('Window blurred - IME context deactivated');
    }
  }

  private async getIMEStatus(): Promise<any> {
    // Platform-specific IME status detection
    const status = {
      isEnabled: true,
      currentInputMethod: 'unknown',
      supportedInputMethods: [],
      currentLanguage: app.getLocale(),
      isComposing: false,
    };

    return { success: true, status };
  }

  private async requestPermissions(): Promise<{ success: boolean; permissions: IMEPermissions; error?: string }> {
    try {
      // Check for keyboard access permission
      this.permissions.keyboardAccess = await this.checkKeyboardAccessPermission();
      
      // Check for global shortcuts permission
      this.permissions.globalShortcuts = await this.checkGlobalShortcutsPermission();
      
      // Check for input monitoring permission (macOS specific)
      this.permissions.inputMonitoring = await this.checkInputMonitoringPermission();
      
      // Check for accessibility API permission
      this.permissions.accessibilityAPI = await this.checkAccessibilityPermission();

      log.info('Permissions check completed:', this.permissions);
      return { success: true, permissions: this.permissions };
    } catch (error: unknown) {
      log.error('Failed to request permissions:', error);
      return { success: false, permissions: this.permissions, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async checkPermissions(): Promise<{ success: boolean; permissions: IMEPermissions }> {
    return { success: true, permissions: this.permissions };
  }

  private async checkKeyboardAccessPermission(): Promise<boolean> {
    // Basic keyboard access is usually available in Electron
    return true;
  }

  private async checkGlobalShortcutsPermission(): Promise<boolean> {
    try {
      // Test registering a dummy shortcut
      const testShortcut = 'CommandOrControl+Shift+F24';
      const registered = globalShortcut.register(testShortcut, () => {});
      if (registered) {
        globalShortcut.unregister(testShortcut);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async checkInputMonitoringPermission(): Promise<boolean> {
    // Platform-specific input monitoring permission check
    if (process.platform === 'darwin') {
      // On macOS, check for input monitoring permission
      // This would require native code to properly check
      return true; // Simplified for now
    }
    return true;
  }

  private async checkAccessibilityPermission(): Promise<boolean> {
    // Platform-specific accessibility permission check
    if (process.platform === 'darwin') {
      // On macOS, check for accessibility permission
      // This would require native code to properly check
      return true; // Simplified for now
    }
    return true;
  }

  private async registerGlobalShortcut(accelerator: string, action: string): Promise<{ success: boolean; error?: string }> {
    if (!this.permissions.globalShortcuts) {
      return { success: false, error: 'Global shortcuts permission not granted' };
    }

    try {
      const registered = globalShortcut.register(accelerator, () => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('ime-keyboard:global-shortcut', { accelerator, action });
        }
      });

      if (registered) {
        log.info(`Global shortcut registered: ${accelerator} -> ${action}`);
        return { success: true };
      } else {
        return { success: false, error: 'Failed to register global shortcut' };
      }
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async unregisterGlobalShortcut(accelerator: string): Promise<{ success: boolean; error?: string }> {
    try {
      globalShortcut.unregister(accelerator);
      log.info(`Global shortcut unregistered: ${accelerator}`);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async getKeyboardLayout(): Promise<{ success: boolean; layout?: any; error?: string }> {
    try {
      const layout = {
        name: 'US',
        language: app.getLocale(),
        variant: 'QWERTY',
        isRTL: false,
      };

      return { success: true, layout };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async setIMEMode(mode: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Platform-specific IME mode setting
      log.info(`Setting IME mode to: ${mode}`);
      
      if (this.mainWindow) {
        this.mainWindow.webContents.send('ime-keyboard:mode-changed', { mode });
      }

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  cleanup(): void {
    // Cleanup all listeners and shortcuts
    this.keyboardListeners.clear();
    globalShortcut.unregisterAll();
    
    log.info('IME Keyboard Manager cleaned up');
  }
}
