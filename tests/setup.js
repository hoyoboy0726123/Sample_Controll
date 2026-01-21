import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// 每個測試後清理 React 組件
afterEach(() => {
  cleanup();
});
