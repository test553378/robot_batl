import { defineConfig } from '@playwright/test'

const chromium = process.env.CHROMIUM_EXECUTABLE

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  timeout: 120_000,
  workers: 1,
  use: {
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    deviceScaleFactor: 1,
    launchOptions: {
      executablePath: chromium || undefined,
      args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    },
  },
  projects: process.env.WEBKIT ? [{ name: 'webkit', use: { browserName: 'webkit', launchOptions: {} } }] : [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
