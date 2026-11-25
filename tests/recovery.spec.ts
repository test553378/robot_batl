import { expect, test } from '@playwright/test'
import { openGame } from './browser'

test('shows a reload action if WebGL 2 is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, options?: unknown) {
      return kind === 'webgl2' ? null : Reflect.apply(getContext, this, [kind, options])
    } as typeof getContext
  })
  await openGame(page)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'もういちど' })).toBeVisible()
})

test('can reload after the active WebGL context is lost', async ({ page }) => {
  await openGame(page)
  await expect(page.getByRole('button', { name: 'あそぶ' })).toBeVisible()
  const triggered = await page.locator('#view canvas').evaluate((element) => {
    const gl = (element as HTMLCanvasElement).getContext('webgl2')
    const extension = gl?.getExtension('WEBGL_lose_context')
    extension?.loseContext()
    return !!extension
  })
  test.skip(!triggered, 'WEBGL_lose_context is unavailable on this engine')
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'もういちど' }).click()
  await expect(page.getByRole('button', { name: 'あそぶ' })).toBeVisible()
})

test('offers a retry if the game entry asset cannot be downloaded', async ({ page }) => {
  await openGame(page, true)
  await expect(page.getByRole('heading', { name: 'ゲームを よめなかったよ' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'もういちど' })).toBeVisible()
})
