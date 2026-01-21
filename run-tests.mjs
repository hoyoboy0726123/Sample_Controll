#!/usr/bin/env node

/**
 * 簡化的測試運行器
 * 由於 npm 依賴安裝問題，使用 npx 運行測試
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 運行單元測試...\n');

// 使用 npx 運行 vitest，不依賴本地安裝
const vitest = spawn('npx', [
  '--yes',
  'vitest@latest',
  'run',
  '--root', __dirname,
  '--reporter=verbose'
], {
  stdio: 'inherit',
  shell: true
});

vitest.on('error', (error) => {
  console.error('❌ 測試運行失敗:', error.message);
  process.exit(1);
});

vitest.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ 所有測試通過！');
  } else {
    console.log(`\n❌ 測試失敗 (退出碼: ${code})`);
  }
  process.exit(code);
});
