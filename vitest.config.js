// 簡化的 vitest 配置 - 使用內建 node 環境，不依賴外部包
export default {
  test: {
    globals: true,
    environment: 'node', // 使用內建 node 環境而非 happy-dom
    setupFiles: './tests/setup.js',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        'electron/',
      ],
    },
  },
};
