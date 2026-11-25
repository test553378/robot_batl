import { expect, test } from '@playwright/test'
import { openGame } from './browser'

test('renders real part previews and restores the selected construction', async ({ page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))
  await openGame(page)
  await expect(page.getByRole('button', { name: 'あそぶ' })).toBeVisible()
  await page.getByRole('button', { name: 'あそぶ' }).click()
  await expect(page.locator('.part-option img')).toHaveCount(3)
  const previews = await page.locator('.part-option img').evaluateAll((images) =>
    images.map((image) => (image as HTMLImageElement).src))
  expect(new Set(previews).size).toBe(3)
  await page.locator('[data-action="slot-arms"]').click()
  await page.locator('[data-action="part-fire"]').click()
  await page.locator('[data-action="slot-legs"]').click()
  await page.locator('[data-action="part-rescue"]').click()
  await page.locator('[data-action="slot-arms"]').click()
  await expect(page.locator('[data-action="part-fire"]')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'ひだりに まわす' }).click()
  if (process.env.CAPTURE) {
    await page.screenshot({ path: 'docs/screenshots/01-garage.jpg', quality: 91 })
  }
  await page.getByRole('button', { name: 'かんせい！' }).click()
  await expect(page.getByRole('heading', { name: 'ダークスカウト' })).toBeVisible()
  if (process.env.PHASE_ONE) {
    await page.getByRole('button', { name: 'つぎのロボ' }).click()
    await expect(page.getByRole('heading', { name: 'デストロギア' })).toBeVisible()
    await page.getByRole('button', { name: 'つぎのロボ' }).click()
    await expect(page.getByRole('heading', { name: 'グランヴェイル' })).toBeVisible()
    if (process.env.CAPTURE) await page.screenshot({ path: 'docs/screenshots/02-boss.jpg', quality: 91 })
  }
  await page.reload()
  await page.getByRole('button', { name: 'あそぶ' }).click()
  await page.locator('[data-action="slot-arms"]').click()
  await expect(page.locator('[data-action="part-fire"]')).toHaveAttribute('aria-pressed', 'true')
  expect(pageErrors).toEqual([])
})
