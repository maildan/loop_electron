// Electron 개발자 도구 설정 및 유틸리티
// src/main/devtools.ts

import { BrowserWindow } from 'electron';
import log from 'electron-log';

interface DevToolsOptions {
  mode?: 'right' | 'bottom' | 'undocked' | 'detach';
  activate?: boolean;
  closeOnWindowClose?: boolean;
  suppressWarnings?: boolean;
}

export class DevToolsManager {
  private window: BrowserWindow;
  private options: DevToolsOptions;
  private isDevToolsOpen = false;
  private warningPatterns = [
    'Autofill',
    'keyboardLayout', 
    'ResizeObserver',
    'Passthrough is not supported',
    'was constructed with a URL',
    'Not implemented: navigation',
    'Synchronous XMLHttpRequest',
    '[Deprecation]',
    '[Violation]',
  ];

  constructor(window: BrowserWindow, options: DevToolsOptions = {}) {
    this.window = window;
    this.options = {
      mode: 'detach',
      activate: true,
      closeOnWindowClose: true,
      suppressWarnings: true,
      ...options
    };

    this.setup();
  }

  private setup(): void {
    // 키보드 단축키 설정
    this.window.webContents.on('before-input-event', (event, input) => {
      // Ctrl+Shift+I 또는 Command+Option+I를 누르면 개발자 도구 열기/닫기
      if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
        if (this.isDevToolsOpen) {
          this.close();
        } else {
          this.open();
        }
      }
    });

    // 경고 메시지 필터링
    if (this.options.suppressWarnings) {
      this.setupWarningFilters();
    }

    // 창이 닫힐 때 개발자 도구도 닫기
    if (this.options.closeOnWindowClose) {
      this.window.on('close', () => {
        if (this.isDevToolsOpen) {
          this.close();
        }
      });
    }

    // DOM이 준비되면 경고 억제 스크립트 주입
    this.window.webContents.once('dom-ready', () => {
      this.injectWarningSuppressionScript();
    });
  }

  public open(): void {
    try {
      this.window.webContents.openDevTools({ 
        mode: this.options.mode as any,
        activate: this.options.activate 
      });
      this.isDevToolsOpen = true;
      log.debug('개발자 도구가 열렸습니다');
    } catch (error) {
      log.error('개발자 도구를 열 수 없습니다:', error);
    }
  }

  public close(): void {
    try {
      this.window.webContents.closeDevTools();
      this.isDevToolsOpen = false;
      log.debug('개발자 도구가 닫혔습니다');
    } catch (error) {
      log.error('개발자 도구를 닫을 수 없습니다:', error);
    }
  }

  public toggle(): void {
    if (this.isDevToolsOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public isOpen(): boolean {
    return this.isDevToolsOpen;
  }

  private setupWarningFilters(): void {
    // 콘솔 메시지 필터링
    this.window.webContents.on('console-message', (event, level, message) => {
      if (this.warningPatterns.some(pattern => message.includes(pattern))) {
        event.preventDefault();
      }
    });

    // 웹 요청 필터링
    this.window.webContents.session.webRequest.onBeforeRequest(
      { urls: ['*://*/*'] },
      (details, callback) => {
        callback({});
      }
    );
  }

  private injectWarningSuppressionScript(): void {
    const script = `
      (function() {
        // 콘솔 메시지 필터링
        const originalConsole = {
          log: console.log,
          warn: console.warn,
          error: console.error,
          info: console.info
        };

        const warningPatterns = [
          'Autofill',
          'keyboardLayout', 
          'ResizeObserver',
          'Passthrough is not supported',
          'was constructed with a URL',
          'Not implemented: navigation',
          'Synchronous XMLHttpRequest',
          '[Deprecation]',
          '[Violation]',
          'chrome-extension://',
          'Non-JS module files deprecated'
        ];

        const shouldSuppress = (message) => {
          if (typeof message !== 'string') {
            message = String(message);
          }
          return warningPatterns.some(pattern => message.includes(pattern));
        };

        console.log = function(...args) {
          if (!shouldSuppress(args[0])) {
            originalConsole.log.apply(console, args);
          }
        };

        console.warn = function(...args) {
          if (!shouldSuppress(args[0])) {
            originalConsole.warn.apply(console, args);
          }
        };

        console.error = function(...args) {
          if (!shouldSuppress(args[0])) {
            originalConsole.error.apply(console, args);
          }
        };

        console.info = function(...args) {
          if (!shouldSuppress(args[0])) {
            originalConsole.info.apply(console, args);
          }
        };

        // 브라우저 API 무시
        if (typeof window !== 'undefined') {
          window.addEventListener('error', function(e) {
            if (shouldSuppress(e.message)) {
              e.preventDefault();
              return false;
            }
          });

          window.addEventListener('unhandledrejection', function(e) {
            if (shouldSuppress(e.reason)) {
              e.preventDefault();
              return false;
            }
          });
        }
      })();
    `;

    this.window.webContents.executeJavaScript(script).catch(error => {
      log.error('경고 억제 스크립트 실행 실패:', error);
    });
  }
}

export default DevToolsManager;
