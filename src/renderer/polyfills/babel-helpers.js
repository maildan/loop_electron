// 바벨 헬퍼 함수 폴리필 - Electron 렌더러 프로세스용
// ES6/CommonJS 상호 운용성을 위한 필수 바벨 헬퍼 함수 제공
// Next.js와 Webpack이 요구하는 바벨 헬퍼 함수들을 전역적으로 제공

(function(전역컨텍스트) {
  'use strict';
  
  // 핵심 _interop_require_default 헬퍼 함수
  // CommonJS 모듈을 ES6 모듈처럼 사용할 수 있게 해주는 함수
  function _interop_require_default(모듈객체) {
    if (모듈객체 && typeof 모듈객체 === 'object' && 모듈객체.__esModule) {
      return 모듈객체;
    }
    return { default: 모듈객체 };
  }

  // 와일드카드 임포트를 위한 헬퍼 함수
  // import * as foo from 'bar' 형태의 임포트를 처리
  function _interop_require_wildcard(모듈객체, 노드호환모드) {
    // ES 모듈의 경우 바로 반환
    if (!노드호환모드 && 모듈객체 && typeof 모듈객체 === 'object' && 모듈객체.__esModule) {
      return 모듈객체;
    }
    
    // null 또는 원시값 처리
    if (모듈객체 === null || (typeof 모듈객체 !== "object" && typeof 모듈객체 !== "function")) {
      return { default: 모듈객체 };
    }
    
    // 캐시 확인 (성능 최적화)
    const 캐시 = _getRequireWildcardCache(노드호환모드);
    if (캐시 && 캐시.has(모듈객체)) {
      return 캐시.get(모듈객체);
    }
    
    const 새객체 = {};
    const 속성설명자있음 = Object.defineProperty && Object.getOwnPropertyDescriptor;
    
    for (const 키 in 모듈객체) {
      if (키 !== "default" && Object.prototype.hasOwnProperty.call(모듈객체, 키)) {
        const 설명자 = 속성설명자있음 ? Object.getOwnPropertyDescriptor(모듈객체, 키) : null;
        if (설명자 && (설명자.get || 설명자.set)) {
          Object.defineProperty(새객체, 키, 설명자);
        } else {
          새객체[키] = 모듈객체[키];
        }
      }
    }
    
    새객체.default = 모듈객체;
    if (캐시) {
      캐시.set(모듈객체, 새객체);
    }
    return 새객체;
  }

  // 와일드카드 임포트 캐시 관리
  let _약한맵캐시 = null;
  function _getRequireWildcardCache(노드호환모드) {
    if (typeof WeakMap !== "function") return null;
    
    if (!_약한맵캐시) {
      _약한맵캐시 = {
        babel: new WeakMap(),
        node: new WeakMap()
      };
    }
    
    return 노드호환모드 ? _약한맵캐시.node : _약한맵캐시.babel;
  }

  // 타입 검사 헬퍼 함수
  function _typeof(객체) {
    const 심볼타입 = typeof Symbol;
    const 심볼반복자 = 심볼타입 === "function" ? Symbol.iterator : null;
    
    if (심볼타입 === "function" && typeof 심볼반복자 === "symbol") {
      return function(obj) { return typeof obj; };
    } else {
      return function(obj) {
        return obj && 심볼타입 === "function" && obj.constructor === Symbol && obj !== Symbol.prototype 
          ? "symbol" 
          : typeof obj;
      };
    }
  }

  // 클래스 호출 검사 헬퍼 함수
  function _classCallCheck(인스턴스, 생성자) {
    if (!(인스턴스 instanceof 생성자)) {
      throw new TypeError("클래스를 함수로 호출할 수 없습니다");
    }
  }

  // 속성 정의 헬퍼 함수
  function _defineProperty(객체, 키, 값) {
    if (키 in 객체) {
      Object.defineProperty(객체, 키, {
        value: 값,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      객체[키] = 값;
    }
    return 객체;
  }

  // 클래스 생성 헬퍼 함수
  function _createClass(생성자, 프로토타입속성들, 정적속성들) {
    if (프로토타입속성들 && Array.isArray(프로토타입속성들)) {
      _defineProperties(생성자.prototype, 프로토타입속성들);
    }
    if (정적속성들 && Array.isArray(정적속성들)) {
      _defineProperties(생성자, 정적속성들);
    }
    
    Object.defineProperty(생성자, "prototype", { 
      writable: false,
      enumerable: false,
      configurable: false
    });
    
    return 생성자;
  }

  // 속성 정의 헬퍼 함수
  function _defineProperties(대상, 속성들) {
    for (let i = 0; i < 속성들.length; i++) {
      const 설명자 = 속성들[i];
      설명자.enumerable = 설명자.enumerable || false;
      설명자.configurable = true;
      if ("value" in 설명자) 설명자.writable = true;
      Object.defineProperty(대상, 설명자.key, 설명자);
    }
  }

  // 상속 헬퍼 함수
  function _inherits(자식클래스, 부모클래스) {
    if (typeof 부모클래스 !== "function" && 부모클래스 !== null) {
      throw new TypeError("슈퍼 표현식은 null이거나 함수여야 합니다, " + typeof 부모클래스);
    }
    자식클래스.prototype = Object.create(부모클래스 && 부모클래스.prototype, {
      constructor: {
        value: 자식클래스,
        writable: true,
        configurable: true
      }
    });
    if (부모클래스) _setPrototypeOf(자식클래스, 부모클래스);
  }

  // 프로토타입 설정 헬퍼 함수
  function _setPrototypeOf(객체, 프로토타입) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };
    return _setPrototypeOf(객체, 프로토타입);
  }

  // 모든 헬퍼 함수들을 객체로 정리
  const 헬퍼함수들 = {
    _interop_require_default,
    _interop_require_wildcard,
    _getRequireWildcardCache,
    _typeof,
    _createClass,
    _defineProperties,
    _classCallCheck,
    _defineProperty,
    _inherits,
    _setPrototypeOf
  };  
  // 여러 전역 컨텍스트에 헬퍼 함수들을 안전하게 등록
  const 컨텍스트들 = [전역컨텍스트];
  if (typeof window === 'object' && window !== null) 컨텍스트들.push(window);
  if (typeof global === 'object' && global !== null) 컨텍스트들.push(global);
  if (typeof self === 'object' && self !== null) 컨텍스트들.push(self);

  컨텍스트들.forEach(컨텍스트 => {
    if (컨텍스트 && typeof 컨텍스트 === 'object') {
      Object.keys(헬퍼함수들).forEach(함수명 => {
        try {
          // 이미 정의되지 않았거나 우리 버전이 더 나은 경우에만 설정
          if (typeof 컨텍스트[함수명] !== 'function') {
            Object.defineProperty(컨텍스트, 함수명, {
              value: 헬퍼함수들[함수명],
              writable: true,
              enumerable: false,
              configurable: true
            });
          }
        } catch (오류) {
          // 일부 컨텍스트는 읽기 전용일 수 있으므로 조용히 계속
          if (전역컨텍스트.console && typeof 전역컨텍스트.console.debug === 'function') {
            전역컨텍스트.console.debug(`[바벨헬퍼] ${함수명}를 컨텍스트에 등록할 수 없음:`, 오류.message);
          }
        }
      });

      // Next.js가 찾는 특별한 형태로도 등록 (이중 언더스코어)
      try {
        if (!컨텍스트.__interop_require_default) {
          컨텍스트.__interop_require_default = _interop_require_default;
        }
        if (!컨텍스트.__interop_require_wildcard) {
          컨텍스트.__interop_require_wildcard = _interop_require_wildcard;
        }
      } catch (오류) {
        // 무시
      }
    }
  });

  // 개발 환경에서 디버그 정보 출력
  if (typeof process === 'object' && process.env && process.env.NODE_ENV === 'development') {
    const 등록된헬퍼들 = Object.keys(헬퍼함수들).filter(함수명 => 
      typeof 전역컨텍스트[함수명] === 'function'
    );
    
    if (전역컨텍스트.console && typeof 전역컨텍스트.console.log === 'function') {
      전역컨텍스트.console.log('[바벨헬퍼] 등록된 헬퍼 함수들:', 등록된헬퍼들);
      전역컨텍스트.console.log('[바벨헬퍼] 컨텍스트 수:', 컨텍스트들.length);
    }
  }

  // 모듈 시스템을 위한 내보내기
  if (typeof module === 'object' && module.exports) {
    module.exports = 헬퍼함수들;
  }
  
  return 헬퍼함수들;

})(typeof globalThis === 'object' ? globalThis : (typeof window === 'object' ? window : this));
