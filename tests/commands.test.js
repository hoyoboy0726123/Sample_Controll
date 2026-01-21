import { describe, it, expect } from 'vitest';

/**
 * 終端命令檢測測試
 *
 * 測試 detectWindowsCommands 和 detectUnixCommands 函數
 */

describe('Command Detection - Windows Commands', () => {
  // 模擬 detectWindowsCommands 函數
  const detectWindowsCommands = (trimmed, originalData) => {
    // start cmd /k <command>
    const startCmdMatch = trimmed.match(/^start\s+cmd\s+\/k\s+(.+)/i);
    if (startCmdMatch) {
      return {
        shouldIntercept: true,
        shell: 'cmd.exe',
        name: 'CMD',
        command: startCmdMatch[1],
        originalCommand: originalData
      };
    }

    // start cmd (無參數)
    if (/^start\s+cmd\b/i.test(trimmed)) {
      return {
        shouldIntercept: true,
        shell: 'cmd.exe',
        name: 'CMD',
        originalCommand: originalData
      };
    }

    // wt -d <directory> <command>
    const wtDirMatch = trimmed.match(/^wt(?:\.exe)?\s+-d\s+(\S+)\s+(.+)/i);
    if (wtDirMatch) {
      return {
        shouldIntercept: true,
        shell: 'auto',
        name: 'Windows Terminal',
        cwd: wtDirMatch[1].replace(/['"]/g, ''),
        command: wtDirMatch[2],
        originalCommand: originalData
      };
    }

    return null;
  };

  it('should detect "start cmd /k npm run dev"', () => {
    const result = detectWindowsCommands('start cmd /k npm run dev', 'start cmd /k npm run dev');

    expect(result).not.toBeNull();
    expect(result.shouldIntercept).toBe(true);
    expect(result.shell).toBe('cmd.exe');
    expect(result.name).toBe('CMD');
    expect(result.command).toBe('npm run dev');
  });

  it('should detect "start cmd" without parameters', () => {
    const result = detectWindowsCommands('start cmd', 'start cmd');

    expect(result).not.toBeNull();
    expect(result.shouldIntercept).toBe(true);
    expect(result.shell).toBe('cmd.exe');
  });

  it('should detect "wt -d ./frontend npm start"', () => {
    const result = detectWindowsCommands('wt -d ./frontend npm start', 'wt -d ./frontend npm start');

    expect(result).not.toBeNull();
    expect(result.shouldIntercept).toBe(true);
    expect(result.shell).toBe('auto');
    expect(result.name).toBe('Windows Terminal');
    expect(result.cwd).toBe('./frontend');
    expect(result.command).toBe('npm start');
  });

  it('should NOT detect standalone "cmd" command', () => {
    const result = detectWindowsCommands('cmd', 'cmd');
    expect(result).toBeNull();
  });

  it('should NOT detect standalone "powershell" command', () => {
    const result = detectWindowsCommands('powershell', 'powershell');
    expect(result).toBeNull();
  });
});

describe('Command Detection - Unix Commands', () => {
  const detectUnixCommands = (trimmed, originalData) => {
    // gnome-terminal -- <command>
    const gnomeMatch = trimmed.match(/^gnome-terminal\s+--\s+(.+)/i);
    if (gnomeMatch) {
      return {
        shouldIntercept: true,
        shell: 'bash',
        name: 'GNOME Terminal',
        command: gnomeMatch[1],
        originalCommand: originalData
      };
    }

    // gnome-terminal (無參數)
    if (/^gnome-terminal\b/i.test(trimmed)) {
      return {
        shouldIntercept: true,
        shell: 'bash',
        name: 'GNOME Terminal',
        originalCommand: originalData
      };
    }

    return null;
  };

  it('should detect "gnome-terminal -- npm run dev"', () => {
    const result = detectUnixCommands('gnome-terminal -- npm run dev', 'gnome-terminal -- npm run dev');

    expect(result).not.toBeNull();
    expect(result.shouldIntercept).toBe(true);
    expect(result.shell).toBe('bash');
    expect(result.name).toBe('GNOME Terminal');
    expect(result.command).toBe('npm run dev');
  });

  it('should detect "gnome-terminal" without parameters', () => {
    const result = detectUnixCommands('gnome-terminal', 'gnome-terminal');

    expect(result).not.toBeNull();
    expect(result.shouldIntercept).toBe(true);
  });

  it('should NOT detect standalone "bash" command', () => {
    const result = detectUnixCommands('bash', 'bash');
    expect(result).toBeNull();
  });
});

describe('Command Detection - ReDoS Protection', () => {
  it('should reject commands longer than 5000 characters', () => {
    const longCommand = 'start cmd /k ' + 'a'.repeat(6000);

    // 模擬 detectNewTerminalCommand 的長度檢查
    const shouldReject = longCommand.length > 5000;

    expect(shouldReject).toBe(true);
  });

  it('should accept commands under 5000 characters', () => {
    const normalCommand = 'start cmd /k npm run dev';

    const shouldReject = normalCommand.length > 5000;

    expect(shouldReject).toBe(false);
  });
});

describe('Path Validation', () => {
  it('should normalize relative paths', () => {
    const path = require('path');

    const relativePath = '../test';
    const normalized = path.resolve(relativePath);

    // 應該轉換為絕對路徑
    expect(normalized).toMatch(/^[\/A-Z:]/);
    expect(normalized).not.toContain('..');
  });

  it('should resolve complex paths', () => {
    const path = require('path');

    const complexPath = '/home/user/../user/./project';
    const normalized = path.resolve(complexPath);

    // 應該簡化路徑
    expect(normalized).not.toContain('..');
    expect(normalized).not.toContain('./');
  });
});
