// Electron 렌더러 프로세스용 Process 폴리필
// 브라우저 호환성을 위한 최소한의 process 객체 제공

// 통합된 process 폴리필
const 프로세스폴리필 = {
  env: {
    NODE_ENV: (typeof window !== 'undefined' && window.process?.env?.NODE_ENV) || 'development',
    ELECTRON: 'true',
    ELECTRON_RENDERER: 'true',
    BROWSER: 'true',
  },
  platform: (typeof window !== 'undefined' && window.process?.platform) || 'unknown',
  version: (typeof window !== 'undefined' && window.process?.version) || '16.0.0',
  versions: {
    node: (typeof window !== 'undefined' && window.process?.versions?.node) || '16.0.0',
    electron: (typeof window !== 'undefined' && window.process?.versions?.electron) || '19.0.0',
  },
  browser: true,
  nextTick: (콜백) => {
    setTimeout(콜백, 0);
  },
  cwd: () => '/',
  chdir: () => {},
  exit: () => {},
  kill: () => {},
  pid: 1,
  ppid: 0,
  title: 'browser',
  arch: (typeof window !== 'undefined' && window.process?.arch) || 'x64',
  argv: [],
  argv0: 'node',
  execArgv: [],
  execPath: '',
  stdout: null,
  stderr: null,
  stdin: null,
};

module.exports = 프로세스폴리필;
