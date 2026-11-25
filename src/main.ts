import './ui/style.css'
import { loadAudio, loadConfig, saveAudio, saveConfig, type AudioSettings } from './core/preferences'
import { Stage } from './core/stage'
import { partsFor, slots, type RobotPartSlot } from './robots/catalog'
import type { EnemyModel } from './robots/enemy'
import { errorScreen, garage, intro, title } from './ui/menus'

const app = document.querySelector<HTMLElement>('#game')!
const view = document.querySelector<HTMLElement>('#view')!
const ui = document.querySelector<HTMLElement>('#ui')!
const orientation = matchMedia('(orientation: portrait)')
let config = loadConfig()
const audio = loadAudio()
let audioOpen = false
let active: RobotPartSlot = 'head'
let round: EnemyModel = 0
let screen: 'title' | 'garage' | 'intro' = 'title'
let stage: Stage | undefined
let alive = true
let frameId = 0

function fail() {
  alive = false
  cancelAnimationFrame(frameId)
  ui.innerHTML = errorScreen()
}

function render() {
  if (!stage) return
  if (screen === 'title') ui.innerHTML = title(audio, audioOpen)
  if (screen === 'garage') ui.innerHTML = garage(stage, config, active, 0)
  if (screen === 'intro') ui.innerHTML = intro(round, true)
}

function show(next: typeof screen) {
  screen = next
  stage?.show(screen, config, round)
  render()
}

ui.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')
  const action = target?.dataset.action
  if (!action) return
  if (action === 'reload') location.reload()
  if (!stage || !alive) return
  if (action === 'play' || action === 'refit') show('garage')
  if (action === 'back') show('title')
  if (action === 'audio') { audioOpen = !audioOpen; render() }
  if (action.startsWith('audio-')) {
    const key = action.slice(6) as keyof AudioSettings
    audio[key] = !audio[key]
    saveAudio(audio)
    render()
  }
  if (action.startsWith('slot-')) {
    const slot = slots.find((candidate) => candidate === action.slice(5))
    if (slot) { active = slot; render() }
  }
  if (action.startsWith('part-')) {
    const id = partsFor(active).find((candidate) => candidate === action.slice(5))
    if (id && config[active] !== id) {
      config = { ...config, [active]: id }
      saveConfig(config)
      stage.refit(config, active)
      render()
    }
  }
  if (action === 'left') stage.rotate(-0.53)
  if (action === 'right') stage.rotate(0.53)
  if (action === 'finish') { round = 0; show('intro') }
  if (action === 'start') {
    if (round < 2) { round = (round + 1) as EnemyModel; show('intro') }
    else show('garage')
  }
})

let drag: { id: number; x: number } | undefined
ui.addEventListener('pointerdown', (event) => {
  const area = (event.target as HTMLElement).closest<HTMLElement>('[data-rotate]')
  if (!area || drag) return
  drag = { id: event.pointerId, x: event.clientX }
  area.setPointerCapture(event.pointerId)
})
ui.addEventListener('pointermove', (event) => {
  if (drag?.id !== event.pointerId) return
  stage?.rotate((event.clientX - drag.x) * 0.012)
  drag.x = event.clientX
})
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
  ui.addEventListener(name, (event) => { if (drag?.id === event.pointerId) drag = undefined })
}
app.addEventListener('contextmenu', (event) => event.preventDefault())

function rotateOverlay() {
  document.querySelector('.orientation')?.remove()
  if (orientation.matches) app.insertAdjacentHTML('beforeend', '<div class="orientation" role="status"><span aria-hidden="true">↻</span><b>よこにしてね</b></div>')
  stage?.resize()
}
orientation.addEventListener('change', rotateOverlay)

function init() {
  try {
    if (!document.createElement('canvas').getContext('webgl2')) { fail(); return }
    stage = new Stage(view, fail)
    new ResizeObserver(() => stage?.resize()).observe(view)
    show('title')
    rotateOverlay()
    let previous = performance.now()
    function loop(now: number) {
      if (!alive) return
      stage?.draw(Math.min((now - previous) / 1000, 0.05))
      previous = now
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)
  } catch (error) {
    console.error(error)
    fail()
  }
}
requestAnimationFrame(() => requestAnimationFrame(init))
