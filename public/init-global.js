// Global initialization script for Electron renderer
// This script should be loaded first to ensure global is available

(function() {
  'use strict';
  
  // Ensure global is available in the renderer process
  if (typeof global === 'undefined') {
    if (typeof window !== 'undefined') {
      window.global = window;
    } else if (typeof self !== 'undefined') {
      self.global = self;
    } else {
      // Fallback for other environments
      this.global = this;
    }
  }
  
  // Critical: Define _interop_require_default immediately to prevent Next.js errors
  if (typeof _interop_require_default === 'undefined') {
    function _interop_require_default(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    
    if (typeof window !== 'undefined') {
      window._interop_require_default = _interop_require_default;
    }
    if (typeof global !== 'undefined') {
      global._interop_require_default = _interop_require_default;
    }
    if (typeof globalThis !== 'undefined') {
      globalThis._interop_require_default = _interop_require_default;
    }
  }
  
  // Ensure process is available for compatibility
  if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
    window.process = {
      env: {
        NODE_ENV: 'development',
        ELECTRON: 'true',
        ELECTRON_RENDERER: 'true',
        BROWSER: 'true',
      },
      browser: true,
      nextTick: function(callback) {
        setTimeout(callback, 0);
      },
      version: '',
      versions: {
        node: '',
        electron: '',
      },
      platform: 'browser',
    };
  }
  
  // Add Node.js globals polyfill for browser environment
  if (typeof window !== 'undefined') {
    // Polyfill for __dirname and __filename
    if (typeof window.__dirname === 'undefined') {
      window.__dirname = '/';
    }
    if (typeof window.__filename === 'undefined') {
      window.__filename = '/index.js';
    }
    
    // Make sure they're also available globally
    if (typeof __dirname === 'undefined') {
      window.__dirname = '/';
      globalThis.__dirname = '/';
    }
    if (typeof __filename === 'undefined') {
      window.__filename = '/index.js';
      globalThis.__filename = '/index.js';
    }
    
    // Add require polyfill if not already available
    if (typeof window.require === 'undefined') {
      window.require = function(id) {
        // Mock common modules
        switch (id) {
          case 'path':
            return {
              join: function() {
                return Array.prototype.slice.call(arguments).join('/').replace(/\/+/g, '/');
              },
              resolve: function() {
                return Array.prototype.slice.call(arguments).join('/').replace(/\/+/g, '/');
              },
              dirname: function(path) {
                return path.substring(0, path.lastIndexOf('/'));
              },
              basename: function(path) {
                return path.substring(path.lastIndexOf('/') + 1);
              },
              extname: function(path) {
                var lastDot = path.lastIndexOf('.');
                return lastDot === -1 ? '' : path.substring(lastDot);
              },
              sep: '/',
              delimiter: ':'
            };
          case 'fs':
            return {};
          case 'os':
            return {
              platform: function() { return 'browser'; },
              arch: function() { return 'x64'; }
            };
          case 'crypto':
            return {};
          case 'util':
            return {
              format: function() { return Array.prototype.slice.call(arguments).join(' '); }
            };
          default:
            console.warn('Module "' + id + '" not found in require polyfill');
            return {};
        }
      };
      
      // Make require available globally
      globalThis.require = window.require;
      if (typeof global !== 'undefined') {
        global.require = window.require;
      }
    }
  }
})();
