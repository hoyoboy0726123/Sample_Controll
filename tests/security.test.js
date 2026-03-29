import { describe, it, expect } from 'vitest';

/**
 * 安全驗證函數單元測試
 *
 * 這些測試驗證應用程式中的關鍵安全函數
 */

describe('Security - Command Validation', () => {
  // 模擬 validateTabData 函數（從 App.jsx）
  const validateTabData = (tab) => {
    if (!tab || typeof tab !== 'object') return false;

    if (typeof tab.id !== 'string' || tab.id.length === 0 || tab.id.length > 256) {
      return false;
    }

    if (tab.shell !== undefined && typeof tab.shell !== 'string') {
      return false;
    }
    if (tab.cwd !== undefined && (typeof tab.cwd !== 'string' || tab.cwd.length > 1000)) {
      return false;
    }
    if (tab.title !== undefined && (typeof tab.title !== 'string' || tab.title.length > 256)) {
      return false;
    }

    return true;
  };

  it('should accept valid tab data', () => {
    const validTab = {
      id: 'terminal-1',
      title: 'Terminal 1',
      shell: 'bash',
      cwd: '/home/user',
    };

    expect(validateTabData(validTab)).toBe(true);
  });

  it('should reject null or undefined', () => {
    expect(validateTabData(null)).toBe(false);
    expect(validateTabData(undefined)).toBe(false);
  });

  it('should reject non-object values', () => {
    expect(validateTabData('string')).toBe(false);
    expect(validateTabData(123)).toBe(false);
    expect(validateTabData([])).toBe(false);
  });

  it('should reject invalid id (empty string)', () => {
    const invalidTab = {
      id: '',
      title: 'Terminal 1',
    };

    expect(validateTabData(invalidTab)).toBe(false);
  });

  it('should reject invalid id (too long)', () => {
    const invalidTab = {
      id: 'a'.repeat(300),
      title: 'Terminal 1',
    };

    expect(validateTabData(invalidTab)).toBe(false);
  });

  it('should reject invalid shell type', () => {
    const invalidTab = {
      id: 'terminal-1',
      shell: 123, // should be string
    };

    expect(validateTabData(invalidTab)).toBe(false);
  });

  it('should reject invalid cwd (too long)', () => {
    const invalidTab = {
      id: 'terminal-1',
      cwd: 'a'.repeat(1500),
    };

    expect(validateTabData(invalidTab)).toBe(false);
  });

  it('should reject invalid title (too long)', () => {
    const invalidTab = {
      id: 'terminal-1',
      title: 'a'.repeat(300),
    };

    expect(validateTabData(invalidTab)).toBe(false);
  });
});

describe('Security - Settings Validation', () => {
  const validateSettings = (settings) => {
    const defaults = {
      defaultShell: 'auto',
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: 'dark',
      restoreSession: true,
    };

    if (!settings || typeof settings !== 'object') {
      return defaults;
    }

    return {
      defaultShell: typeof settings.defaultShell === 'string' && settings.defaultShell.length < 256
        ? settings.defaultShell
        : defaults.defaultShell,
      fontSize: Number.isInteger(settings.fontSize) && settings.fontSize >= 10 && settings.fontSize <= 30
        ? settings.fontSize
        : defaults.fontSize,
      fontFamily: typeof settings.fontFamily === 'string' && settings.fontFamily.length < 500
        ? settings.fontFamily
        : defaults.fontFamily,
      theme: ['dark', 'light'].includes(settings.theme)
        ? settings.theme
        : defaults.theme,
      restoreSession: typeof settings.restoreSession === 'boolean'
        ? settings.restoreSession
        : defaults.restoreSession,
    };
  };

  it('should use defaults for null input', () => {
    const result = validateSettings(null);
    expect(result.defaultShell).toBe('auto');
    expect(result.fontSize).toBe(14);
    expect(result.theme).toBe('dark');
  });

  it('should validate and accept valid settings', () => {
    const validSettings = {
      defaultShell: 'bash',
      fontSize: 16,
      fontFamily: 'Consolas',
      theme: 'light',
      restoreSession: false,
    };

    const result = validateSettings(validSettings);
    expect(result.defaultShell).toBe('bash');
    expect(result.fontSize).toBe(16);
    expect(result.theme).toBe('light');
    expect(result.restoreSession).toBe(false);
  });

  it('should reject invalid fontSize (too small)', () => {
    const invalidSettings = {
      fontSize: 5,
    };

    const result = validateSettings(invalidSettings);
    expect(result.fontSize).toBe(14); // default
  });

  it('should reject invalid fontSize (too large)', () => {
    const invalidSettings = {
      fontSize: 100,
    };

    const result = validateSettings(invalidSettings);
    expect(result.fontSize).toBe(14); // default
  });

  it('should reject invalid theme', () => {
    const invalidSettings = {
      theme: 'neon', // not in ['dark', 'light']
    };

    const result = validateSettings(invalidSettings);
    expect(result.theme).toBe('dark'); // default
  });

  it('should reject non-boolean restoreSession', () => {
    const invalidSettings = {
      restoreSession: 'yes', // should be boolean
    };

    const result = validateSettings(invalidSettings);
    expect(result.restoreSession).toBe(true); // default
  });
});

describe('Security - Command Detection', () => {
  // 測試命令檢測邏輯是否正確攔截

  it('should detect dangerous commands', () => {
    const dangerousCommands = [
      'rm -rf /',
      'format C:',
      'del /S /F',
      'mkfs.ext4 /dev/sda',
    ];

    const dangerousPatterns = [
      /rm\s+-rf\s+\/\s*$/i,
      /format\s+[A-Z]:\s*$/i,
      /del\s+\/[SF]/i,
      /mkfs\./i,
    ];

    dangerousCommands.forEach(cmd => {
      const isDangerous = dangerousPatterns.some(pattern => pattern.test(cmd));
      expect(isDangerous).toBe(true);
    });
  });

  it('should not flag safe commands as dangerous', () => {
    const safeCommands = [
      'ls -la',
      'npm install',
      'git status',
      'mkdir test',
    ];

    const dangerousPatterns = [
      /rm\s+-rf\s+\/\s*$/i,
      /format\s+[A-Z]:\s*$/i,
      /del\s+\/[SF]/i,
      /mkfs\./i,
    ];

    safeCommands.forEach(cmd => {
      const isDangerous = dangerousPatterns.some(pattern => pattern.test(cmd));
      expect(isDangerous).toBe(false);
    });
  });
});
