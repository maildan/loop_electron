/**
 * Electron 개발자 도구 설정 및 디버깅 유틸리티
 * 
 * 개발자 도구 콘솔에서 불필요한 경고 제거 및 성능 모니터링 도구 설정
 */

// ElectronAPI 타입을 useElectron에서 가져옴
import type { ElectronAPI } from '../hooks/useElectron';

// 전역 window 객체 확장
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// 불필요한 콘솔 경고 억제
const suppressWarnings = () => {
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  
  // 특정 패턴의 경고 메시지 필터링
  const suppressPatterns = [
    'Autofill',
    'keyboardLayout',
    'ResizeObserver',
    'Passthrough is not supported',
    'was constructed with a URL',
    'Not implemented: navigation',
    'Synchronous XMLHttpRequest',
    'Deprecation',
    'Violation',
  ];
  
  // 경고 메시지 필터링
  console.warn = (...args) => {
    const message = args[0]?.toString() || '';
    if (!suppressPatterns.some(pattern => message.includes(pattern))) {
      originalConsoleWarn(...args);
    }
  };
  
  // 오류 메시지 필터링 (중요한 오류는 보존)
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    if (!suppressPatterns.some(pattern => message.includes(pattern))) {
      originalConsoleError(...args);
    }
  };
  
  console.log('✅ 개발자 도구 콘솔 경고 필터가 설정되었습니다.');
};

// 페이지 성능 측정 및 모니터링
const setupPerformanceMonitoring = () => {
  // 페이지 로드 시간 측정
  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const domLoadTime = perfData.domComplete - perfData.domLoading;
    
    console.log(`📊 페이지 로드 시간: ${pageLoadTime}ms`);
    console.log(`📊 DOM 로드 시간: ${domLoadTime}ms`);
    
    // 성능 정보를 메인 프로세스로 전송
    if (window.electronAPI && window.electronAPI.send) {
      window.electronAPI.send('performance-data', {
        pageLoadTime,
        domLoadTime,
        timestamp: Date.now()
      });
    }
  });
};

// 메모리 사용량 모니터링
const setupMemoryMonitoring = (interval = 30000) => {
  if (!window.electronAPI) return;
  
  const checkMemory = async () => {
    try {
      if (window.electronAPI.getMemoryInfo) {
        const memInfo = await window.electronAPI.getMemoryInfo();
        const memoryUsageMB = Math.round((memInfo.total - memInfo.free) / 1024);
        
        // 메모리 사용량이 높으면 GC 트리거
        if (memoryUsageMB > 1000 && window.electronAPI.triggerGC) { // 1GB 이상
          await window.electronAPI.triggerGC();
          console.log('🧹 메모리 정리가 수행되었습니다.');
        }
      }
    } catch (error) {
      // 에러 로깅 없이 무시
    }
  };
  
  // 주기적으로 메모리 체크
  setInterval(checkMemory, interval);
  console.log('✅ 메모리 모니터링이 설정되었습니다.');
};

// 개발자 도구 단축키 설정
const setupDevToolsKeyboardShortcuts = () => {
  if (!window.electronAPI) return;
  
  window.addEventListener('keydown', (event) => {
    // Ctrl+Shift+I 또는 Command+Option+I를 눌렀을 때 개발자 도구 토글
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'i') {
      if (window.electronAPI.toggleDevTools) {
        window.electronAPI.toggleDevTools();
      }
      event.preventDefault();
    }
  });
  
  console.log('✅ 개발자 도구 단축키가 설정되었습니다.');
};

// 모든 설정 적용
export const setupDevTools = () => {
  suppressWarnings();
  setupPerformanceMonitoring();
  setupMemoryMonitoring();
  setupDevToolsKeyboardShortcuts();
  
  console.log('✅ 개발자 도구 설정이 완료되었습니다.');
};

export default setupDevTools;
