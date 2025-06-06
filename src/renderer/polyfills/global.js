// Electron 렌더러 프로세스용 전역 폴리필 - 현대적 표준 사용
// 전역 객체 접근을 위한 범용 표준으로 globalThis 사용

// 먼저 globalThis가 사용 가능한지 확인 (현대적 표준)
if (typeof globalThis === 'object' && globalThis !== null) {
  // globalThis가 이미 존재하므로 사용
  if (!globalThis.global) {
    globalThis.global = globalThis;
  }
} else {
  // 이전 환경용 대체
  (function() {
    if (typeof window === 'object' && window !== null) {
      window.globalThis = window;
      window.global = window;
    } else if (typeof self === 'object' && self !== null) {
      self.globalThis = self;
      self.global = self;
    } else if (typeof this === 'object' && this !== null) {
      this.globalThis = this;
      this.global = this;
    }
  })();
}

// 중요한 Babel 헬퍼들 - Next.js 오류 방지를 위해 즉시 정의
(function() {
  'use strict';
  
  // _interop_require_default 헬퍼 함수 정의
  function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }
  
  // 추가 Babel 헬퍼들 정의
  function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
      return obj;
    }
    if (obj === null || (typeof obj !== "object" && typeof obj !== "function")) {
      return { default: obj };
    }
    const newObj = {};
    if (obj) {
      for (const key in obj) {
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }
    newObj.default = obj;
    return newObj;
  }
  
  // 모든 전역 컨텍스트에서 함수들이 사용 가능한지 확인
  const 컨텍스트들 = [globalThis, window, global, self].filter(ctx => 
    typeof ctx === 'object' && ctx !== null
  );
  
  컨텍스트들.forEach(context => {
    try {
      context._interop_require_default = _interop_require_default;
      context._interop_require_wildcard = _interop_require_wildcard;
    } catch (error) {
      // 컨텍스트가 읽기 전용인 경우 조용히 무시
      console.debug('[폴리필] 컨텍스트에 헬퍼를 설정할 수 없음:', context.constructor.name);
    }
  });
  
  // 개발용 디버그 로깅
  if (typeof process === 'object' && process.env && process.env.NODE_ENV === 'development') {
    console.debug('[폴리필] Babel 헬퍼들이 초기화됨:', {
      _interop_require_default: typeof globalThis._interop_require_default,
      _interop_require_wildcard: typeof globalThis._interop_require_wildcard,
      global: typeof globalThis.global,
      contexts: 컨텍스트들.length
    });
  }
})();

module.exports = globalThis;
