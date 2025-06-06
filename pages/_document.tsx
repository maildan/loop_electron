import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* Global initialization script - must be loaded first */}
        <script 
          dangerouslySetInnerHTML={{
            __html: `
              // Critical: Immediate _interop_require_default definition
              if (typeof _interop_require_default === 'undefined') {
                function _interop_require_default(obj) {
                  return obj && obj.__esModule ? obj : { default: obj };
                }
                if (typeof window !== 'undefined') {
                  window._interop_require_default = _interop_require_default;
                }
                if (typeof globalThis !== 'undefined') {
                  globalThis._interop_require_default = _interop_require_default;
                }
              }
              
              // Immediate global initialization
              (function() {
                if (typeof global === 'undefined') {
                  if (typeof window !== 'undefined') {
                    window.global = window;
                  } else if (typeof self !== 'undefined') {
                    self.global = self;
                  } else {
                    this.global = this;
                  }
                }
                if (typeof globalThis === 'undefined') {
                  if (typeof window !== 'undefined') {
                    window.globalThis = window;
                  } else if (typeof self !== 'undefined') {
                    self.globalThis = self;
                  } else {
                    this.globalThis = this;
                  }
                }
                // Add Node.js globals immediately
                if (typeof window !== 'undefined') {
                  if (typeof window.__dirname === 'undefined') {
                    window.__dirname = '/';
                    globalThis.__dirname = '/';
                  }
                  if (typeof window.__filename === 'undefined') {
                    window.__filename = '/index.js';
                    globalThis.__filename = '/index.js';
                  }
                  
                  // Add minimal require polyfill immediately
                  if (typeof window.require === 'undefined') {
                    window.require = function(id) {
                      switch (id) {
                        case 'path':
                          return {
                            join: function() { 
                              return Array.prototype.slice.call(arguments).join('/').replace(/\\/\\/+/g, '/'); 
                            },
                            dirname: function(p) { return p.substring(0, p.lastIndexOf('/')); },
                            basename: function(p) { return p.substring(p.lastIndexOf('/') + 1); }
                          };
                        default:
                          console.warn('Module not found:', id);
                          return {};
                      }
                    };
                    globalThis.require = window.require;
                    if (typeof global !== 'undefined') {
                      global.require = window.require;
                    }
                  }
                }
              })();
            `
          }}
        />
        <script src="/init-global.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
