import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDatabase, useNative, TypingEvent, TypingAnalysis } from '../hooks/useElectron';

interface TypingTestProps {
  text: string;
  onComplete: (results: TypingTestResults) => void;
  mode: 'practice' | 'test';
  timeLimit?: number;
  showLiveStats?: boolean;
}

interface TypingTestResults {
  wpm: number;
  accuracy: number;
  errors: number;
  corrections: number;
  totalTime: number;
  analysis?: TypingAnalysis;
}

interface TypingState {
  currentIndex: number;
  typedText: string;
  errors: number;
  corrections: number;
  startTime: number | null;
  endTime: number | null;
  backspaceCount: number;
  isActive: boolean;
  isComplete: boolean;
}

export const TypingTest: React.FC<TypingTestProps> = ({
  text,
  onComplete,
  mode,
  timeLimit,
  showLiveStats = true,
}) => {
  const [state, setState] = useState<TypingState>({
    currentIndex: 0,
    typedText: '',
    errors: 0,
    corrections: 0,
    startTime: null,
    endTime: null,
    backspaceCount: 0,
    isActive: false,
    isComplete: false,
  });

  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit || 0);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const typingEvents = useRef<TypingEvent[]>([]);

  const database = useDatabase();
  const native = useNative();

  // Initialize test
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Handle timer for timed tests
  useEffect(() => {
    if (state.isActive && timeLimit && timeLimit > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            finishTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.isActive, timeLimit]);

  // Calculate live statistics
  useEffect(() => {
    if (state.startTime && state.typedText.length > 0) {
      const currentTime = Date.now();
      const timeElapsed = (currentTime - state.startTime) / 1000 / 60; // minutes
      const wordsTyped = state.typedText.length / 5;
      const currentWpm = Math.round(wordsTyped / timeElapsed);
      
      const correctChars = calculateCorrectChars();
      const totalChars = state.typedText.length;
      const currentAccuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

      setLiveWpm(currentWpm || 0);
      setLiveAccuracy(currentAccuracy);
    }
  }, [state.typedText, state.startTime]);

  const calculateCorrectChars = useCallback((): number => {
    let correct = 0;
    for (let i = 0; i < Math.min(state.typedText.length, text.length); i++) {
      if (state.typedText[i] === text[i]) {
        correct++;
      }
    }
    return correct;
  }, [state.typedText, text]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (state.isComplete) return;

    // Start test on first keystroke
    if (!state.isActive && !state.startTime) {
      setState(prev => ({
        ...prev,
        isActive: true,
        startTime: Date.now(),
      }));
    }

    // Handle backspace
    if (event.key === 'Backspace') {
      setState(prev => ({
        ...prev,
        backspaceCount: prev.backspaceCount + 1,
      }));
    }

    // Record typing event
    const typingEvent: TypingEvent = {
      text: event.key,
      durationMs: state.startTime ? Date.now() - state.startTime : 0,
      backspaces: event.key === 'Backspace' ? 1 : 0,
      corrections: 0, // Will be calculated later
      timestamp: Date.now(),
    };

    typingEvents.current.push(typingEvent);
  }, [state.isActive, state.isComplete, state.startTime]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (state.isComplete) return;

    const newTypedText = event.target.value;
    const newIndex = newTypedText.length;

    // Calculate errors and corrections
    let errors = 0;
    let corrections = 0;

    for (let i = 0; i < Math.min(newTypedText.length, text.length); i++) {
      if (newTypedText[i] !== text[i]) {
        errors++;
      }
    }

    // Detect corrections (when backspace is used to fix mistakes)
    if (newTypedText.length < state.typedText.length) {
      corrections = state.corrections + 1;
    }

    setState(prev => ({
      ...prev,
      currentIndex: newIndex,
      typedText: newTypedText,
      errors,
      corrections,
    }));

    // Check if test is complete
    if (newIndex >= text.length || (timeLimit && timeRemaining <= 0)) {
      finishTest();
    }
  }, [state.isComplete, state.typedText, state.corrections, text, timeLimit, timeRemaining]);

  const finishTest = useCallback(async () => {
    if (state.isComplete) return;

    const endTime = Date.now();
    const totalTime = state.startTime ? (endTime - state.startTime) / 1000 : 0;
    const wordsTyped = state.typedText.length / 5;
    const wpm = totalTime > 0 ? Math.round((wordsTyped / totalTime) * 60) : 0;
    
    const correctChars = calculateCorrectChars();
    const accuracy = state.typedText.length > 0 ? (correctChars / state.typedText.length) * 100 : 100;

    setState(prev => ({
      ...prev,
      isComplete: true,
      isActive: false,
      endTime,
    }));

    // Process typing data with native module
    let analysis: TypingAnalysis | undefined;
    try {
      analysis = await native.processTypingDataGpu(typingEvents.current);
    } catch (error) {
      console.warn('GPU processing failed, falling back to CPU:', error);
      try {
        analysis = await native.processTypingDataCpu(typingEvents.current);
      } catch (cpuError) {
        console.error('CPU processing also failed:', cpuError);
      }
    }

    const results: TypingTestResults = {
      wpm,
      accuracy,
      errors: state.errors,
      corrections: state.corrections,
      totalTime,
      analysis,
    };

    // Save to database
    try {
      await database.insertTypingLog({
        sessionId: `session_${Date.now()}`,
        text: state.typedText,
        timestamp: endTime,
        wpm,
        accuracy,
        errors: state.errors,
        corrections: state.corrections,
      });
    } catch (error) {
      console.error('Failed to save typing log:', error);
    }

    onComplete(results);
  }, [state, text, calculateCorrectChars, native, database, onComplete]);

  const resetTest = useCallback(() => {
    setState({
      currentIndex: 0,
      typedText: '',
      errors: 0,
      corrections: 0,
      startTime: null,
      endTime: null,
      backspaceCount: 0,
      isActive: false,
      isComplete: false,
    });

    setLiveWpm(0);
    setLiveAccuracy(100);
    setTimeRemaining(timeLimit || 0);
    typingEvents.current = [];

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [timeLimit]);

  const getCharacterClass = useCallback((index: number): string => {
    if (index < state.typedText.length) {
      return state.typedText[index] === text[index] ? 'correct' : 'incorrect';
    }
    if (index === state.currentIndex) {
      return 'current';
    }
    return 'pending';
  }, [state.typedText, state.currentIndex, text]);

  return (
    <div className="typing-test bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
      {/* Header with live stats */}
      {showLiveStats && (
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {liveWpm}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">WPM</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {liveAccuracy}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Accuracy</div>
            </div>
            {timeLimit && (
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Time</div>
              </div>
            )}
          </div>
          <button
            onClick={resetTest}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Reset
          </button>
        </div>
      )}

      {/* Text display */}
      <div className="text-display mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-lg leading-relaxed">
        {text.split('').map((char, index) => (
          <span
            key={index}
            className={`character ${getCharacterClass(index)} ${
              getCharacterClass(index) === 'correct'
                ? 'text-green-600 dark:text-green-400'
                : getCharacterClass(index) === 'incorrect'
                ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900'
                : getCharacterClass(index) === 'current'
                ? 'bg-blue-200 dark:bg-blue-800'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {char}
          </span>
        ))}
      </div>

      {/* Input area */}
      <div className="input-area">
        <textarea
          ref={inputRef}
          value={state.typedText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={state.isComplete}
          placeholder={state.isActive ? '' : 'Start typing to begin...'}
          className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min((state.currentIndex / text.length) * 100, 100)}%`,
            }}
          />
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Progress: {state.currentIndex} / {text.length} characters
        </div>
      </div>
    </div>
  );
};
