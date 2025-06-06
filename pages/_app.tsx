import '../styles/simple.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { ElectronProvider } from '../src/renderer/hooks/useElectron';
import { useEffect } from 'react';

// Electron 렌더러 프로세스용 전역 폴리필
if (typeof window !== 'undefined') {
  // 바벨 헬퍼 함수를 먼저 로드 (Next.js가 필요로 함)
  require('../src/renderer/polyfills/babel-helpers');
  
  // 전역 객체가 사용 가능한지 확인
  if (typeof global === 'undefined') {
    (window as any).global = window;
  }
  // 구형 환경을 위한 globalThis 사용 가능성 확인
  if (typeof globalThis === 'undefined') {
    (window as any).globalThis = window;
  }
}

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // 개발 환경에서만 개발자 도구 설정 로드
    if (process.env.NODE_ENV === 'development') {
      import('../src/renderer/utils/devtools').then((module) => {
        module.setupDevTools();
      }).catch(console.error);
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ElectronProvider>
        <Component {...pageProps} />
      </ElectronProvider>
    </ThemeProvider>
  );
}

export default MyApp;
