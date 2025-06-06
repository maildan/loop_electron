/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  // 개발 모드에서는 정적 export를 사용하지 않음
  ...(isDev ? {} : { output: 'export' }),
  distDir: 'dist/renderer',
  trailingSlash: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  images: {
    unoptimized: true,
  },
  experimental: {
    esmExternals: false,
  },
  
  // Electron 환경에서 React Fast Refresh 비활성화
  reactStrictMode: false,
  
  // 개발 환경에서 hot reload 최적화
  ...(isDev ? {
    // Fast Refresh 비활성화 (Electron 환경에서 문제 발생)
    compiler: {
      removeConsole: false,
    },
  } : {}),
  
  // CSP 및 보안 헤더 설정
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: isDev 
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:;" // 개발 모드
              : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;" // 프로덕션 모드
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block"
          }
        ],
      }
    ];
  },
  
  // 개발 환경에서 캐시 최적화
  onDemandEntries: {
    // 페이지를 메모리에 보관하는 시간(ms)
    maxInactiveAge: 60 * 1000,
    // 동시에 유지할 페이지 수
    pagesBufferLength: 5,
  },
  // Remove srcDir since we're using pages directory directly
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.target = 'electron-renderer'
      
      // Fix "global is not defined" issue
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: require.resolve('path-browserify'),
        os: false,
        crypto: false,
        stream: false,
        buffer: require.resolve('buffer'),
        util: false,
        global: require.resolve('./src/renderer/polyfills/global.js'),
      };
      
      // Add alias for global
      config.resolve.alias = {
        ...config.resolve.alias,
        global: require.resolve('./src/renderer/polyfills/global.js'),
      };
      
      // Add polyfill for global and process
      config.plugins.push(
        new webpack.ProvidePlugin({
          global: 'globalThis',
          process: require.resolve('./src/renderer/polyfills/process.js'),
          Buffer: ['buffer', 'Buffer'],
          require: require.resolve('./src/renderer/polyfills/require.js'),
          '_interop_require_default': [require.resolve('./src/renderer/polyfills/babel-helpers.js'), '_interop_require_default'],
          '_interop_require_wildcard': [require.resolve('./src/renderer/polyfills/babel-helpers.js'), '_interop_require_wildcard'],
        })
      );
      
      // DefinePlugin으로 전역 변수 정의
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.ELECTRON_IS_DEV': JSON.stringify(dev),
          'process.env.DISABLE_EVAL_DEVTOOL': JSON.stringify(!dev),
          '__dirname': JSON.stringify('/'),
          '__filename': JSON.stringify('/index.js'),
        })
      );
      
      // 개발 환경에서는 eval 허용
      if (dev) {
        config.devtool = 'eval-source-map';
        
        // React Fast Refresh 플러그인 제거 (Electron 환경에서 문제 발생)
        config.plugins = config.plugins.filter(plugin => {
          return plugin.constructor.name !== 'ReactRefreshPlugin';
        });
        
        // React Refresh 관련 로더 제거
        config.module.rules.forEach(rule => {
          if (rule.use && Array.isArray(rule.use)) {
            rule.use = rule.use.filter(loader => {
              if (typeof loader === 'object' && loader.loader) {
                return !loader.loader.includes('react-refresh');
              }
              return true;
            });
          }
        });
      } else {
        config.devtool = 'source-map';
      }
      
      // Suppress webpack warnings for process, Buffer, etc.
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(Autofill|keyboardLayout|ResizeObserver)$/
        })
      );
      
      // 콘솔 경고 메시지 필터링
      config.infrastructureLogging = {
        level: 'error', // 오류 수준의 로그만 표시
      };
    }

    // Exclude native modules from bundle
    config.externals = [
      ...(config.externals || []),
      {
        'better-sqlite3': 'commonjs better-sqlite3',
        'mongodb': 'commonjs mongodb',
        'prisma': 'commonjs prisma',
        '@prisma/client': 'commonjs @prisma/client',
      }
    ]

    // Remove DefinePlugin conflicts
    const definePlugins = config.plugins.filter(plugin => 
      plugin.constructor.name === 'DefinePlugin'
    )
    
    if (definePlugins.length > 1) {
      config.plugins = config.plugins.filter((plugin, index) => {
        if (plugin.constructor.name === 'DefinePlugin') {
          return plugin === definePlugins[0]
        }
        return true
      })
    }

    return config
  },
}

module.exports = nextConfig
