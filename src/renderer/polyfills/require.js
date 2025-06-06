// Electron 렌더러 프로세스용 Require 폴리필
// 브라우저 호환성을 위한 최소한의 require 함수 제공

const 브라우저리콰이어 = (모듈명) => {
  switch (모듈명) {
    case 'path':
      return {
        join: (...parts) => parts.join('/').replace(/\/+/g, '/'),
        dirname: (경로) => 경로.substring(0, 경로.lastIndexOf('/')) || '/',
        basename: (경로) => 경로.substring(경로.lastIndexOf('/') + 1),
        resolve: (...parts) => parts.join('/').replace(/\/+/g, '/'),
        extname: (경로) => {
          const lastDot = 경로.lastIndexOf('.');
          return lastDot === -1 ? '' : 경로.substring(lastDot);
        },
        sep: '/',
        delimiter: ':',
        normalize: (경로) => 경로.replace(/\/+/g, '/'),
        isAbsolute: (경로) => 경로.startsWith('/')
      };
    case 'fs':
      return {
        readFileSync: () => '',
        writeFileSync: () => {},
        existsSync: () => false,
        statSync: () => ({ isDirectory: () => false, isFile: () => false }),
        readdirSync: () => []
      };
    case 'os':
      return { 
        platform: () => 'browser',
        type: () => 'Browser',
        release: () => '1.0.0',
        homedir: () => '/',
        tmpdir: () => '/tmp'
      };
    case 'crypto':
      return {
        createHash: () => ({ update: () => {}, digest: () => '' }),
        randomBytes: () => new Uint8Array(0)
      };
    case 'stream':
      return {
        Readable: class {},
        Writable: class {},
        Transform: class {}
      };
    case 'util':
      return {
        promisify: (fn) => fn,
        inspect: (obj) => JSON.stringify(obj)
      };
    case 'events':
      return {
        EventEmitter: class {
          on() {}
          emit() {}
          removeListener() {}
        }
      };
    case 'next/dist/compiled/react-refresh/runtime':
      // React Refresh 런타임을 위한 더미 모듈
      return {
        default: {
          injectIntoGlobalHook: () => {
            console.log('[Polyfill] React Refresh injectIntoGlobalHook called');
          },
          register: () => {
            console.log('[Polyfill] React Refresh register called');
          },
          createSignatureFunctionForTransform: () => () => {
            console.log('[Polyfill] React Refresh createSignatureFunctionForTransform called');
            return () => {};
          },
          isLikelyComponentType: () => {
            console.log('[Polyfill] React Refresh isLikelyComponentType called');
            return false;
          }
        },
        // Named exports도 제공
        injectIntoGlobalHook: () => {
          console.log('[Polyfill] React Refresh injectIntoGlobalHook (named) called');
        },
        register: () => {
          console.log('[Polyfill] React Refresh register (named) called');
        },
        createSignatureFunctionForTransform: () => () => {
          console.log('[Polyfill] React Refresh createSignatureFunctionForTransform (named) called');
          return () => {};
        },
        isLikelyComponentType: () => {
          console.log('[Polyfill] React Refresh isLikelyComponentType (named) called');
          return false;
        }
      };
    case './internal/helpers':
      // Next.js 내부 헬퍼를 위한 더미 모듈
      return {};
    default:
      // 알려지지 않은 모듈에 대해서는 경고 없이 빈 객체 반환
      return {};
  }
};

if (typeof window !== 'undefined') {
  window.require = browserRequire;
}
if (typeof globalThis !== 'undefined') {
  globalThis.require = browserRequire;
}

module.exports = browserRequire;
