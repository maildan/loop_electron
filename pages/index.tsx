import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Dashboard } from '../src/renderer/components/Dashboard';
import { TypingTest } from '../src/renderer/components/TypingTest';
import { SettingsPanel } from '../src/renderer/components/SettingsPanel';
import { useElectron, UserSettings } from '../src/renderer/hooks/useElectron';
import { useTheme } from 'next-themes';

type ActiveTab = '대시보드' | '연습' | '테스트' | '설정';

const sampleTexts = [
  "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the English alphabet at least once, making it a perfect sentence for typing practice.",
  "In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell, nor yet a dry, bare, sandy hole with nothing in it to sit down on or to eat.",
  "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity.",
  "To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles.",
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('대시보드');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [currentText, setCurrentText] = useState(sampleTexts[0]);
  const [isElectron, setIsElectron] = useState(false);

  const electron = useElectron();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsElectron(!!electron);
    loadSettings();
  }, [electron]);

  const loadSettings = async () => {
    if (!electron) return;

    try {
      const userSettings = await electron.database.getSettings();
      if (userSettings) {
        setSettings(userSettings);
        if (userSettings.theme !== 'auto') {
          setTheme(userSettings.theme);
        }
      } else {
        // Set default settings
        const defaultSettings: UserSettings = {
          theme: 'auto',
          fontSize: 16,
          fontFamily: 'Monaco',
          soundEnabled: true,
          autoSave: true,
          language: 'en',
          keyboardLayout: 'qwerty',
          practiceMode: 'normal',
          targetWpm: 50,
          showLiveWpm: true,
          showLiveAccuracy: true,
          enableGpuAcceleration: true,
          monitorPerformance: true,
        };
        setSettings(defaultSettings);
        await electron.database.updateSettings(defaultSettings);
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
    }
  };

  const handleSettingsUpdate = async (newSettings: Partial<UserSettings>) => {
    if (!electron || !settings) return;

    try {
      const updatedSettings = { ...settings, ...newSettings };
      await electron.database.updateSettings(updatedSettings);
      setSettings(updatedSettings);

      // Apply theme change immediately
      if (newSettings.theme) {
        setTheme(newSettings.theme);
      }
    } catch (error) {
      console.error('설정 업데이트 실패:', error);
    }
  };

  const handleTypingTestComplete = (results: any) => {
    console.log('타이핑 테스트 완료:', results);
    // Could show results modal or navigate to results page
  };

  const getRandomText = () => {
    const randomIndex = Math.floor(Math.random() * sampleTexts.length);
    setCurrentText(sampleTexts[randomIndex]);
  };

  if (!isElectron) {
    return (
      <>
        <Head>
          <title>loop</title>
          <meta name="description" content="Loop Typing Practice App" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Loop App
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This app is designed to run in Electron environment.
            </p>
            <p className="text-gray-500 dark:text-gray-500">
              Please run the app through Electron to access all features.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>loop</title>
        <meta name="description" content="Loop Typing Practice App" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Navigation */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700" data-testid="main-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Loop Typing
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('대시보드')}
                  className={`${
                    activeTab === '대시보드'
                      ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('연습')}
                  className={`${
                    activeTab === '연습'
                      ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  Practice
                </button>
                <button
                  onClick={() => setActiveTab('테스트')}
                  className={`${
                    activeTab === '테스트'
                      ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  Test
                </button>
                <button
                  onClick={() => setActiveTab('설정')}
                  className={`${
                    activeTab === '설정'
                      ? 'border-blue-500 text-gray-900 dark:text-gray-100'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  Settings
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-6">
        {activeTab === '대시보드' && <Dashboard />}
        
        {activeTab === '연습' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Typing Practice
              </h2>
              <button
                onClick={getRandomText}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Get Random Text
              </button>
            </div>
            <TypingTest
              text={currentText}
              onComplete={handleTypingTestComplete}
              mode="practice"
              showLiveStats={settings?.showLiveWpm || settings?.showLiveAccuracy}
            />
          </div>
        )}
        
        {activeTab === '테스트' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Typing Test
              </h2>
              <div className="flex space-x-4 mb-4">
                <button
                  onClick={() => setCurrentText(sampleTexts[0])}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  1 Minute Test
                </button>
                <button
                  onClick={() => setCurrentText(sampleTexts[1])}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                >
                  3 Minute Test
                </button>
                <button
                  onClick={() => setCurrentText(sampleTexts[2])}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  5 Minute Test
                </button>
              </div>
            </div>
            <TypingTest
              text={currentText}
              onComplete={handleTypingTestComplete}
              mode="test"
              timeLimit={60} // 1 minute for now
              showLiveStats={settings?.showLiveWpm || settings?.showLiveAccuracy}
            />
          </div>
        )}
        
        {activeTab === '설정' && settings && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <SettingsPanel
              settings={settings}
              onSettingsUpdate={handleSettingsUpdate}
            />
          </div>
        )}
      </main>
    </div>
    </>
  );
}
