import { expect, test, type Page } from '@playwright/test'
import { openGame } from './browser'

async function startBattle(page: Page) {
  await openGame(page)
  await page.getByRole('button', { name: 'あそぶ' }).tap()
  await page.getByRole('button', { name: 'かんせい！' }).tap()
  await page.getByRole('button', { name: 'スタート！' }).tap()
}

test('touch battle, pause, rotate, continue, and win the opening round', async ({ page, browserName }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => { if (response.status() >= 400) errors.push(response.url()) })
  await startBattle(page)
  const enemy = page.locator('[data-meter="enemy"]')
  const attack = page.getByRole('button', { name: 'こうげき' })
  const down = page.getByRole('button', { name: 'した' })
  const player = page.locator('[data-meter="player"]')
  await expect(enemy).toHaveAttribute('aria-valuenow', '60')
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page)
    const a = (await attack.boundingBox())!
    const d = (await down.boundingBox())!
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: d.x + 20, y: d.y + 20, id: 0 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
      { x: d.x + 20, y: d.y + 20, id: 0 }, { x: a.x + a.width / 2, y: a.y + a.height / 2, id: 1 },
    ] })
    await expect(down).toHaveAttribute('data-held', '')
    await expect(attack).toHaveAttribute('data-held', '')
    await expect(enemy).not.toHaveAttribute('aria-valuenow', '60', { timeout: 12_000 })
    if (process.env.CAPTURE) await page.screenshot({ path: 'docs/screenshots/03-battle.jpg', quality: 91 })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    await expect(down).not.toHaveAttribute('data-held')
    await expect(attack).not.toHaveAttribute('data-held')
    await cdp.detach()
  } else {
    await attack.tap()
    await expect(enemy).not.toHaveAttribute('aria-valuenow', '60', { timeout: 12_000 })
  }
  await page.getByRole('button', { name: 'いちじていし' }).tap()
  await expect(page.getByRole('dialog')).toBeVisible()
  const saved = await player.getAttribute('aria-valuenow')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByText('よこにしてね')).toBeVisible()
  await page.setViewportSize({ width: 667, height: 320 })
  await expect(page.getByText('よこにしてね')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(player).toHaveAttribute('aria-valuenow', saved!)
  await page.getByRole('button', { name: 'つづける' }).tap()
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.down('Space')
  await expect(page.getByRole('heading', { name: 'かった！' })).toBeVisible({ timeout: 65_000 })
  await page.keyboard.up('Space')
  await page.getByRole('button', { name: 'ロボをかえる' }).tap()
  await page.getByRole('button', { name: /かんせい/ }).tap()
  await expect(page.getByRole('heading', { name: 'デストロギア' })).toBeVisible()
  expect(errors).toEqual([])
})
