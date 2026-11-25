import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'

const prefix = '/robot_batl/'
const builtOrigin = 'https://game.test'
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.png': 'image/png',
}

export async function openGame(page: Page, blockEntry = false) {
  const scriptPattern = '**/assets/*.js'
  const block = () => page.route(scriptPattern, (route) => route.abort('failed'))
  if (process.env.GAME_URL) {
    if (blockEntry) await block()
    await page.goto(process.env.GAME_URL)
    return
  }
  const root = resolve('dist')
  await page.route(`${builtOrigin}${prefix}**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const file = resolve(root, pathname.slice(prefix.length) || 'index.html')
    if (!file.startsWith(`${root}/`)) { await route.abort(); return }
    try {
      const body = await readFile(file)
      const suffix = file.slice(file.lastIndexOf('.'))
      await route.fulfill({ body, contentType: types[suffix] ?? 'application/octet-stream' })
    } catch { await route.fulfill({ status: 404, body: 'Missing build artifact' }) }
  })
  if (blockEntry) await block()
  await page.goto(`${builtOrigin}${prefix}`)
}
