/**
 * security-checks.js
 *
 * Electron 앱 보안 체크 모듈
 * - 개발 모드일 때는 Next.js가 내려주는 CSP를 완전히 덮어쓴다 (unsafe-inline, unsafe-eval 허용)
 * - 프로덕션 모드일 때는 엄격한 CSP를 적용
 * - 키보드 이벤트 IPC 핸들러를 등록
 */

const { session, app, webContents, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

/**
 * 안전한 웹 설정을 위한 Header를 설정합니다.
 * 개발 모드와 프로덕션 모드에서 다른 CSP 설정 사용
 */
const securityHeaders = {
  'Content-Security-Policy': isDev 
    // 개발 모드에서는 HMR과 React 개발 도구를 위해 unsafe-inline, unsafe-eval 허용
    ? 'default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\' data:; connect-src \'self\' ws: wss:;'
    // 프로덕션 모드에서는 보안을 강화하지만 스타일 관련 'unsafe-inline'은 유지
    : 'default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\' data:;',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
};

/**
 * HTTP 요청 헤더에 보안 헤더를 적용합니다.
 */
function applySecurityHeaders(details, callback) {
  if (details.responseHeaders) {
    for (const [header, value] of Object.entries(securityHeaders)) {
      if (details.responseHeaders[header]) {
        delete details.responseHeaders[header];
      }
      details.responseHeaders[header] = [value];
    }
  }

  if (callback && typeof callback === 'function') {
    callback({ responseHeaders: details.responseHeaders });
  }
}

/**
 * 모든 세션에 Content Security Policy를 적용합니다.
 * 기본 세션 및 파티션된 세션 모두 포함
 */
function applyCSPToAllSessions() {
  try {
    // 기본 세션에 CSP 적용
    registerCSPForSession(session.defaultSession);
    
    // 모든 세션에 CSP 적용 (파티션된 세션 포함)
    const allSessions = session.getAllSessions?.() || [];
    console.log(`모든 세션에 CSP 적용 중... (세션 수: ${allSessions.length + 1})`);
    
    allSessions.forEach((sess, idx) => {
      try {
        console.log(`세션 #${idx + 1} CSP 적용 중...`);
        registerCSPForSession(sess);
      } catch (err) {
        console.error(`세션 #${idx + 1} CSP 적용 실패:`, err);
      }
    });
    
    console.log('모든 세션에 CSP 적용 완료');
    return true;
  } catch (err) {
    console.error('전체 세션 CSP 적용 중 오류:', err);
    
    // 오류가 발생한 경우에도 기본 세션만이라도 시도
    try {
      console.warn('기본 세션에만 CSP 적용 시도...');
      registerCSPForSession(session.defaultSession);
      return true;
    } catch (fallbackErr) {
      console.error('기본 세션 CSP 적용마저 실패:', fallbackErr);
      return false;
    }
  }
}

/**
 * 특정 세션에 CSP를 등록합니다.
 */
function registerCSPForSession(sess) {
  if (!sess || typeof sess.webRequest?.onHeadersReceived !== 'function') {
    console.error('유효하지 않은 세션 객체:', sess);
    return false;
  }
  
  try {
    // 기존 리스너 제거 (중복 방지)
    sess.webRequest.onHeadersReceived(null);
    
    // 새 CSP 설정 적용
    sess.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
      applySecurityHeaders(details, callback);
    });
    
    console.log(`세션에 CSP 적용 완료 (개발 모드: ${isDev})`);
    return true;
  } catch (err) {
    console.error(`세션 CSP 적용 실패:`, err);
    return false;
  }
}

/**
 * 요청 검증을 설정합니다.
 */
function setupRequestChecks(sess = session.defaultSession) {
  try {
    // 일부 요청 차단
    sess.webRequest.onBeforeRequest((details, callback) => {
      const { url } = details;
      
      // 차단할 URL 패턴
      const blockedPatterns = [
        /\/ads\//,
        /\/tracking\//,
        /\.doubleclick\./,
        /\.googlesyndication\./,
      ];
      
      const isBlocked = blockedPatterns.some(pattern => pattern.test(url));
      
      if (isBlocked) {
        callback({ cancel: true });
      } else {
        callback({});
      }
    });
    
    console.log('요청 검증 설정 완료');
    return true;
  } catch (err) {
    console.error('요청 검증 설정 실패:', err);
    return false;
  }
}

/**
 * 키보드 이벤트 핸들러를 설정합니다.
 * Renderer → Main으로 날아오는 키보드 이벤트를 수신하여, 다시 메인 윈도우로 보냅니다.
 */
function setupKeyboardEventHandler() {
  try {
    // 'keyboard-event' 핸들러가 이미 등록되어 있는지 확인
    const existingHandlers = ipcMain.listenerCount('keyboard-event');
    
    if (existingHandlers > 0) {
      console.log(`keyboard-event 핸들러가 이미 ${existingHandlers}개 등록되어 있습니다.`);
      return true;
    }
    
    ipcMain.handle('keyboard-event', async (event, eventData) => {
      try {
        console.log(`키보드 이벤트 수신: ${eventData.type} - ${eventData.key}`);
        
        // 메인 윈도우 찾기
        const mainWindow = BrowserWindow.getAllWindows().find(win => !win.isDestroyed());
        
        if (mainWindow && !mainWindow.isDestroyed()) {
          // 메인 윈도우로 키보드 이벤트 전달
          mainWindow.webContents.send('keyboard-event-forwarded', eventData);
          return { success: true };
        } else {
          console.warn('메인 윈도우를 찾을 수 없습니다.');
          return { success: false, error: '메인 윈도우 없음' };
        }
      } catch (error) {
        console.error('키보드 이벤트 처리 중 오류:', error);
        return { success: false, error: error.message };
      }
    });
    
    console.log('키보드 이벤트 핸들러 설정 완료');
    return true;
  } catch (err) {
    console.error('키보드 이벤트 핸들러 설정 실패:', err);
    return false;
  }
}

/**
 * 앱이 준비된 시점에 보안 설정(특히 CSP)을 초기화합니다.
 * 반드시 BrowserWindow 생성 전(또는 거의 직후)에 호출해야 합니다.
 * @param {Electron.App} appObj - Electron 앱 객체 (선택적)
 */
function initializeSecuritySettings(appObj) {
  // 전달된 app 객체가 없으면 전역 app 객체 사용
  const applicationObj = appObj || app || require('electron').app;
  
  try {
    if (!applicationObj || typeof applicationObj !== 'object') {
      console.error('initializeSecuritySettings: 유효한 app 객체를 찾을 수 없습니다.');
      console.warn('폴백 앱 객체 사용 시도 중...');
      // 최종 폴백: 전역 Electron에서 직접 가져오기
      const electron = require('electron');
      if (electron && electron.app) {
        console.log('폴백: electron.app 사용');
        return initializeSecuritySettings(electron.app);
      }
      return false;
    }

    const disableSecurity = process.env.DISABLE_SECURITY === 'true';
    const disableCSP = process.env.DISABLE_CSP === 'true';

    console.log(`initializeSecuritySettings 호출됨 → isDev: ${isDev}, disableSecurity: ${disableSecurity}, disableCSP: ${disableCSP}`);

    if (disableSecurity) {
      console.log('initializeSecuritySettings: 보안 비활성화 환경 → CSP 무시');
      return true;
    }

    // (1) 개발 모드이거나 DISABLE_CSP=true면 CSP를 완전히 덮어쓴다
    if (isDev || disableCSP) {
      applyCSPToAllSessions();
    } else {
      // (2) 프로덕션 모드라면 엄격 CSP 적용
      applyCSPToAllSessions();

      // 추가 보안 로직(예: window open 제한 등)을 여기에 넣어도 좋음
      setupRequestChecks();
    }

    // 키보드 이벤트 핸들러 설정
    setupKeyboardEventHandler();

    console.log('initializeSecuritySettings 완료');
    return true;
  } catch (err) {
    console.error('initializeSecuritySettings 실행 중 오류:', err);
    return false;
  }
}

// 모듈 내보내기
module.exports = {
  initializeSecuritySettings,
  applyCSPToAllSessions,
  registerCSPForSession,
  setupRequestChecks,
  setupKeyboardEventHandler,
  securityHeaders
};

// 환경변수 확인 및 보안 경고 억제
if (isDev || process.env.DISABLE_SECURITY === 'true') {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  console.log('개발 모드: Electron 보안 경고 비활성화');
}
