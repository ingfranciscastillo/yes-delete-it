import js from '@eslint/js';
import globals from 'globals';

// Security rules from PLAN.md §8: no HTML injection, no eval, no network.
const banned = [
  ['innerHTML', 'Use textContent / DOM nodes.'],
  ['outerHTML', 'Use textContent / DOM nodes.'],
  ['insertAdjacentHTML', 'Use DOM nodes.'],
  ['write', 'No document.write.'],
  ['writeln', 'No document.write.'],
];

export default [
  { ignores: ['node_modules/', 'dist/', 'web-ext-artifacts/', 'tests/fixtures/', 'test-results/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: { ...globals.browser, ...globals.webextensions },
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-properties': ['error', ...banned.map(([property, message]) => ({ property, message }))],
      'no-restricted-globals': ['error',
        { name: 'fetch', message: 'The extension never uses the network.' },
        { name: 'XMLHttpRequest', message: 'The extension never uses the network.' },
        { name: 'WebSocket', message: 'The extension never uses the network.' },
        { name: 'EventSource', message: 'The extension never uses the network.' },
      ],
      'no-restricted-syntax': ['error',
        { selector: "MemberExpression[property.name='sendBeacon']", message: 'The extension never uses the network.' },
        { selector: "CallExpression[callee.name='importScripts']", message: 'No remote or dynamic code.' },
        { selector: 'ImportExpression', message: 'No dynamic imports.' },
      ],
    },
  },
  {
    files: ['src/background.js'],
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^inject$' }] },
  },
  {
    files: ['tests/**/*.js', 'scripts/**/*.js', '*.config.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
];
