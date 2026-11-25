import type { BattleInput } from '../battle/battle'

type Control = 'up' | 'down' | 'left' | 'right' | 'attack' | 'special'
const keys: Record<string, Control> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Space: 'attack', KeyX: 'special',
}

export class TouchController {
  private readonly pointers = new Map<number, { control: Control; target: HTMLElement }>()
  private readonly keyboard = new Set<Control>()
  private attackTap = false
  private specialTap = false

  constructor(private readonly container: HTMLElement, private readonly isPlaying: () => boolean) {
    container.addEventListener('pointerdown', this.press)
    window.addEventListener('pointerup', this.release, { capture: true })
    window.addEventListener('pointercancel', this.release, { capture: true })
    container.addEventListener('lostpointercapture', this.release)
    container.addEventListener('click', (event) => {
      // An accessibility activation or keyboard button click has no preceding pointer press.
      if (!this.isPlaying() || event.detail !== 0) return
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-control]')
      this.queue(button?.dataset.control as Control | undefined)
    })
    window.addEventListener('keydown', (event) => {
      const control = keys[event.code]
      if (!control || !this.isPlaying() || (event.code === 'Space' && event.target instanceof HTMLButtonElement)) return
      event.preventDefault()
      if (!event.repeat) this.queue(control)
      this.keyboard.add(control)
      this.paint()
    })
    window.addEventListener('keyup', (event) => {
      const control = keys[event.code]
      if (!control) return
      this.keyboard.delete(control)
      this.paint()
    })
  }

  private queue(control?: Control) {
    if (control === 'attack') this.attackTap = true
    if (control === 'special') this.specialTap = true
  }

  private press = (event: PointerEvent) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-control]')
    if (!this.isPlaying() || !target || target.disabled || event.button !== 0) return
    const control = target.dataset.control as Control
    this.queue(control)
    this.pointers.set(event.pointerId, { control, target })
    try { target.setPointerCapture(event.pointerId) } catch { /* Window-level release still clears the press. */ }
    this.paint()
  }

  private release = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    this.paint()
  }

  private held(control: Control) {
    return this.keyboard.has(control) || [...this.pointers.values()].some((pointer) => pointer.control === control)
  }

  read(): BattleInput {
    const input = {
      x: Number(this.held('right')) - Number(this.held('left')),
      z: Number(this.held('down')) - Number(this.held('up')),
      attack: this.attackTap || this.held('attack'),
      special: this.specialTap,
    }
    this.attackTap = this.specialTap = false
    return input
  }

  clear() {
    for (const [id, { target }] of this.pointers) {
      if (target.hasPointerCapture(id)) target.releasePointerCapture(id)
    }
    this.pointers.clear()
    this.keyboard.clear()
    this.attackTap = this.specialTap = false
    this.paint()
  }

  private paint() {
    this.container.querySelectorAll<HTMLElement>('[data-control]').forEach((element) => {
      element.toggleAttribute('data-held', this.held(element.dataset.control as Control))
    })
  }
}
