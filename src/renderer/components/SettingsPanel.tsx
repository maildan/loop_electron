import React, { useState, useEffect } from 'react';
import { UserSettings, useSystem, useNative, useIME } from '../hooks/useElectron';

interface SettingsPanelProps {
  settings: UserSettings;
  onSettingsUpdate: (settings: Partial<UserSettings>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsUpdate,
}) => {
  const [activeSection, setActiveSection] = useState<string>('general');
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [gpuInfo, setGpuInfo] = useState<any>(null);
  const [imePermissions, setImePermissions] = useState<any>(null);
  const [memoryOptimization, setMemoryOptimization] = useState<any>(null);

  const system = useSystem();
  const native = useNative();
  const ime = useIME();

  useEffect(() => {
    loadSystemInfo();
    loadGpuInfo();
    checkIMEPermissions();
  }, []);

  const loadSystemInfo = async () => {
    try {
      const info = await system.getSystemInfo();
      setSystemInfo(info);
    } catch (error) {
      console.error('시스템 정보 로드 실패:', error);
    }
  };

  const loadGpuInfo = async () => {
    try {
      const info = await native.getGpuInfo();
      setGpuInfo(info);
    } catch (error) {
      console.error('GPU 정보 로드 실패:', error);
    }
  };

  const checkIMEPermissions = async () => {
    try {
      const permissions = await ime.checkPermissions();
      setImePermissions(permissions);
    } catch (error) {
      console.error('IME 권한 확인 실패:', error);
    }
  };

  const handleOptimizeMemory = async () => {
    try {
      const result = await native.optimizeMemory();
      setMemoryOptimization(result);
      setTimeout(() => setMemoryOptimization(null), 5000);
    } catch (error) {
      console.error('메모리 최적화 실패:', error);
    }
  };

  const handleRequestIMEPermissions = async () => {
    try {
      const result = await ime.requestPermissions();
      setImePermissions(result);
    } catch (error) {
      console.error('IME 권한 요청 실패:', error);
    }
  };

  const sections = [
    { id: 'general', name: '일반', icon: '⚙️' },
    { id: 'appearance', name: '외관', icon: '🎨' },
    { id: 'typing', name: '타이핑', icon: '⌨️' },
    { id: 'performance', name: '성능', icon: '🚀' },
    { id: 'system', name: '시스템', icon: '💻' },
    { id: 'permissions', name: '권한', icon: '🔒' },
  ];

  return (
    <div className="settings-panel bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <div className="flex">
        {/* 사이드바 */}
        <div className="w-64 bg-gray-50 dark:bg-gray-800 rounded-l-lg p-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            설정
          </h2>
          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {/* General Settings */}
          {activeSection === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                General Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => onSettingsUpdate({ language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="en">English</option>
                    <option value="ko">한국어</option>
                    <option value="ja">日本語</option>
                    <option value="zh">中文</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Keyboard Layout
                  </label>
                  <select
                    value={settings.keyboardLayout}
                    onChange={(e) => onSettingsUpdate({ keyboardLayout: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="qwerty">QWERTY</option>
                    <option value="dvorak">Dvorak</option>
                    <option value="colemak">Colemak</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => onSettingsUpdate({ soundEnabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable sound effects
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoSave}
                    onChange={(e) => onSettingsUpdate({ autoSave: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Auto-save progress
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Appearance Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Theme
                  </label>
                  <select
                    value={settings.theme}
                    onChange={(e) => onSettingsUpdate({ theme: e.target.value as 'light' | 'dark' | 'auto' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Font Family
                  </label>
                  <select
                    value={settings.fontFamily}
                    onChange={(e) => onSettingsUpdate({ fontFamily: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="Monaco">Monaco</option>
                    <option value="Menlo">Menlo</option>
                    <option value="Courier New">Courier New</option>
                    <option value="SF Mono">SF Mono</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Size: {settings.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={settings.fontSize}
                  onChange={(e) => onSettingsUpdate({ fontSize: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Typing Settings */}
          {activeSection === 'typing' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Typing Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Practice Mode
                  </label>
                  <select
                    value={settings.practiceMode}
                    onChange={(e) => onSettingsUpdate({ practiceMode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="normal">Normal</option>
                    <option value="words">Words Only</option>
                    <option value="numbers">Numbers</option>
                    <option value="special">Special Characters</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target WPM: {settings.targetWpm}
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    value={settings.targetWpm}
                    onChange={(e) => onSettingsUpdate({ targetWpm: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.showLiveWpm}
                    onChange={(e) => onSettingsUpdate({ showLiveWpm: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Show live WPM
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.showLiveAccuracy}
                    onChange={(e) => onSettingsUpdate({ showLiveAccuracy: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Show live accuracy
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Performance Settings */}
          {activeSection === 'performance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Performance Settings
              </h3>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.enableGpuAcceleration}
                    onChange={(e) => onSettingsUpdate({ enableGpuAcceleration: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable GPU acceleration
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.monitorPerformance}
                    onChange={(e) => onSettingsUpdate({ monitorPerformance: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Monitor performance
                  </span>
                </label>
              </div>

              {gpuInfo && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    GPU Information
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div>Name: {gpuInfo.name}</div>
                    <div>Vendor: {gpuInfo.vendor}</div>
                    <div>Type: {gpuInfo.deviceType}</div>
                    <div>Backend: {gpuInfo.backend}</div>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={handleOptimizeMemory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Optimize Memory
                </button>
              </div>

              {memoryOptimization && (
                <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    Memory Optimization Complete
                  </h4>
                  <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                    <div>Memory freed: {memoryOptimization.memoryFreed} bytes</div>
                    <div>Buffers cleaned: {memoryOptimization.buffersCleaned}</div>
                    <div>Current usage: {memoryOptimization.currentMemoryUsage} bytes</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* System Information */}
          {activeSection === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                System Information
              </h3>

              {systemInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      System Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                        <span className="text-gray-900 dark:text-gray-100">{systemInfo.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Architecture:</span>
                        <span className="text-gray-900 dark:text-gray-100">{systemInfo.arch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">CPU Cores:</span>
                        <span className="text-gray-900 dark:text-gray-100">{systemInfo.cpuCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Memory:</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {Math.round(systemInfo.memoryTotal / 1024 / 1024 / 1024)} GB
                        </span>
                      </div>
                    </div>
                  </div>

                  {gpuInfo && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Graphics Details
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">GPU:</span>
                          <span className="text-gray-900 dark:text-gray-100">{gpuInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Vendor:</span>
                          <span className="text-gray-900 dark:text-gray-100">{gpuInfo.vendor}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Backend:</span>
                          <span className="text-gray-900 dark:text-gray-100">{gpuInfo.backend}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Permissions */}
          {activeSection === 'permissions' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Permissions & Security
              </h3>

              <div className="space-y-4">
                <button
                  onClick={handleRequestIMEPermissions}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Request IME Permissions
                </button>

                {imePermissions && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Permission Status
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(imePermissions.permissions || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            value 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {value ? 'Granted' : 'Denied'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
