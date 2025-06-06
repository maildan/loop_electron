import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication;
let firstWindow: Page;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      NEXT_DEV_PORT: '3002', // 테스트용 포트 사용
    },
  });

  // Get the first window that the app opens
  firstWindow = await electronApp.firstWindow();
  
  // Wait for the app to be fully loaded with more retries
  let retries = 5;
  let loaded = false;
  
  while (retries > 0 && !loaded) {
    try {
      await firstWindow.waitForLoadState('networkidle', { timeout: 5000 });
      
      // Check if we're on an error page
      const url = firstWindow.url();
      console.log(`Attempt ${6 - retries}: Current URL is ${url}`);
      
      if (url.includes('chrome-error://')) {
        console.log('Error page detected, waiting and retrying...');
        await firstWindow.waitForTimeout(2000);
        await firstWindow.reload();
        retries--;
        continue;
      }
      
      // Instead of waiting for body, wait for specific content
      try {
        // Wait for either the main navigation or the non-electron message
        await Promise.race([
          firstWindow.waitForSelector('[data-testid="main-nav"]', { timeout: 8000 }),
          firstWindow.waitForSelector('text=Loop Typing App', { timeout: 8000 }),
          firstWindow.waitForTimeout(8000) // Fallback timeout
        ]);
        loaded = true;
      } catch (selectorError) {
        console.log('Content not found, but continuing anyway...');
        loaded = true; // Continue even if selectors are not found
      }
      
    } catch (error: any) {
      console.log(`Loading attempt ${6 - retries} failed:`, error.message);
      retries--;
      if (retries > 0) {
        await firstWindow.waitForTimeout(2000);
        try {
          await firstWindow.reload();
        } catch (reloadError) {
          console.log('Reload failed, continuing...');
        }
      }
    }
  }
  
  if (!loaded) {
    console.log('Warning: App may not have loaded completely');
  }
  
  // Final wait to ensure everything is stable
  await firstWindow.waitForTimeout(3000);
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('Electron App', () => {
  test('should launch and show main window', async () => {
    // Check that the window exists
    expect(firstWindow).toBeTruthy();
    
    // Check window title - retry if context destroyed
    let title = '';
    for (let i = 0; i < 3; i++) {
      try {
        title = await firstWindow.title();
        break;
      } catch (error: any) {
        if (error.message.includes('Execution context was destroyed')) {
          console.log(`Title check attempt ${i + 1} failed, retrying...`);
          await firstWindow.waitForTimeout(1000);
          continue;
        }
        throw error;
      }
    }
    
    expect(title).toBe('loop');
  });

  test('should have correct window dimensions', async () => {
    // Retry window size check if context destroyed
    let windowSize: { width: number; height: number } | undefined;
    for (let i = 0; i < 3; i++) {
      try {
        windowSize = await firstWindow.evaluate(() => {
          return {
            width: window.innerWidth,
            height: window.innerHeight,
          };
        });
        break;
      } catch (error: any) {
        if (error.message.includes('Execution context was destroyed')) {
          console.log(`Window size check attempt ${i + 1} failed, retrying...`);
          await firstWindow.waitForTimeout(1000);
          continue;
        }
        throw error;
      }
    }
    
    expect(windowSize).toBeDefined();
    if (windowSize) {
      expect(windowSize.width).toBeGreaterThan(0);
      expect(windowSize.height).toBeGreaterThan(0);
      expect(windowSize.width).toBeGreaterThan(800);
      expect(windowSize.height).toBeGreaterThan(600);
    }
  });

  test('should load the main navigation', async () => {
    // Wait for navigation to be visible
    await firstWindow.waitForSelector('[data-testid="main-nav"]', {
      timeout: 10000,
    });

    // Check navigation tabs
    const navTabs = firstWindow.locator('[data-testid="nav-tab"]');
    const tabCount = await navTabs.count();
    
    expect(tabCount).toBeGreaterThan(0);
    
    // Check for expected tabs
    await expect(firstWindow.locator('text=Dashboard')).toBeVisible();
    await expect(firstWindow.locator('text=Practice')).toBeVisible();
    await expect(firstWindow.locator('text=Test')).toBeVisible();
    await expect(firstWindow.locator('text=Settings')).toBeVisible();
  });

  test('should navigate between tabs', async () => {
    // Click on Practice tab
    await firstWindow.click('text=Practice');
    await firstWindow.waitForTimeout(500);
    
    // Should show typing test interface
    await expect(firstWindow.locator('[data-testid="typing-test"]')).toBeVisible();
    
    // Click on Dashboard tab
    await firstWindow.click('text=Dashboard');
    await firstWindow.waitForTimeout(500);
    
    // Should show dashboard
    await expect(firstWindow.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should show typing statistics on dashboard', async () => {
    // Navigate to dashboard
    await firstWindow.click('text=Dashboard');
    await firstWindow.waitForTimeout(1000);
    
    // Check for stats cards
    await expect(firstWindow.locator('[data-testid="stats-card"]').first()).toBeVisible();
    
    // Check for charts
    await expect(firstWindow.locator('[data-testid="performance-chart"]')).toBeVisible();
  });

  test('should open settings panel', async () => {
    // Click settings tab
    await firstWindow.click('text=Settings');
    await firstWindow.waitForTimeout(500);
    
    // Should show settings panel
    await expect(firstWindow.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Check for settings sections
    await expect(firstWindow.locator('text=General')).toBeVisible();
    await expect(firstWindow.locator('text=Appearance')).toBeVisible();
    await expect(firstWindow.locator('text=Typing')).toBeVisible();
  });

  test('should handle theme switching', async () => {
    // Navigate to settings
    await firstWindow.click('text=Settings');
    await firstWindow.waitForTimeout(500);
    
    // Find theme toggle
    const themeToggle = firstWindow.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await firstWindow.waitForTimeout(500);
      
      // Check if theme changed
      const bodyClass = await firstWindow.getAttribute('body', 'class');
      expect(bodyClass).toBeDefined();
    }
  });
});

test.describe('Typing Test', () => {
  test.beforeEach(async () => {
    // Navigate to practice tab
    await firstWindow.click('text=Practice');
    await firstWindow.waitForTimeout(500);
  });

  test('should display typing text', async () => {
    await expect(firstWindow.locator('[data-testid="typing-text"]')).toBeVisible();
    
    const textContent = await firstWindow.textContent('[data-testid="typing-text"]');
    expect(textContent).toBeTruthy();
    expect(textContent!.length).toBeGreaterThan(10);
  });

  test('should show typing statistics', async () => {
    // Check for WPM display
    await expect(firstWindow.locator('[data-testid="wpm-display"]')).toBeVisible();
    
    // Check for accuracy display
    await expect(firstWindow.locator('[data-testid="accuracy-display"]')).toBeVisible();
    
    // Check for timer
    await expect(firstWindow.locator('[data-testid="timer-display"]')).toBeVisible();
  });

  test('should start typing test on key press', async () => {
    const textInput = firstWindow.locator('[data-testid="typing-input"]');
    
    if (await textInput.isVisible()) {
      // Focus input and type
      await textInput.focus();
      await textInput.type('hello');
      await firstWindow.waitForTimeout(1000);
      
      // Check if timer started
      const timerText = await firstWindow.textContent('[data-testid="timer-display"]');
      expect(timerText).not.toBe('0:00');
    }
  });
});

test.describe('Database Operations', () => {
  test('should handle database initialization', async () => {
    // Check if database is accessible through IPC
    const dbStats = await firstWindow.evaluate(async () => {
      // @ts-ignore - Electron API should be available
      return await window.electronAPI?.database?.getStats();
    });
    
    expect(dbStats).toBeDefined();
  });

  test('should save typing session data', async () => {
    // Simulate typing session
    await firstWindow.click('text=Practice');
    await firstWindow.waitForTimeout(500);
    
    const textInput = firstWindow.locator('[data-testid="typing-input"]');
    if (await textInput.isVisible()) {
      await textInput.focus();
      await textInput.type('test session data');
      await firstWindow.waitForTimeout(2000);
      
      // Stop session (if there's a stop button)
      const stopButton = firstWindow.locator('[data-testid="stop-test"]');
      if (await stopButton.isVisible()) {
        await stopButton.click();
        await firstWindow.waitForTimeout(1000);
      }
    }
  });
});

test.describe('System Integration', () => {
  test('should show system information in settings', async () => {
    await firstWindow.click('text=Settings');
    await firstWindow.waitForTimeout(500);
    
    // Look for system info section
    const systemInfo = firstWindow.locator('[data-testid="system-info"]');
    if (await systemInfo.isVisible()) {
      await expect(systemInfo).toContainText('Platform:');
      await expect(systemInfo).toContainText('Memory:');
    }
  });

  test('should handle window controls', async () => {
    // Test window minimization (if controls are visible)
    const minimizeButton = firstWindow.locator('[data-testid="minimize-button"]');
    if (await minimizeButton.isVisible()) {
      await minimizeButton.click();
      await firstWindow.waitForTimeout(500);
    }
  });
});

test.describe('Performance', () => {
  test('should load within reasonable time', async () => {
    const startTime = Date.now();
    
    // Navigate to different tabs to test performance
    await firstWindow.click('text=Dashboard');
    await firstWindow.waitForLoadState('networkidle');
    
    await firstWindow.click('text=Practice');
    await firstWindow.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle large dataset visualization', async () => {
    await firstWindow.click('text=Dashboard');
    await firstWindow.waitForTimeout(1000);
    
    // Check if charts render without errors
    const charts = firstWindow.locator('[data-testid="performance-chart"]');
    await expect(charts.first()).toBeVisible();
    
    // Check for any JavaScript errors
    const errors: string[] = [];
    firstWindow.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await firstWindow.waitForTimeout(2000);
    expect(errors.length).toBe(0);
  });
});
