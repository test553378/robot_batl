import './ui/style.css'
import { Battle } from './battle/battle'
import { Campaign } from './battle/campaign'
import { loadAudio, loadConfig, saveAudio, saveConfig, type AudioSettings } from './core/preferences'
import { Stage } from './core/stage'
import { TouchController } from './input/touch'
import { partsFor, slots, type RobotPartSlot } from './robots/catalog'
import { battleScreen, Hud, pauseScreen, result } from './ui/battleUi'
import { errorScreen, garage, intro, title } from './ui/menus'

type Screen = 'title' | 'garage' | 'intro' | 'battle' | 'result'
const app = document.querySelector<HTMLElement>('#game')!
const view = document.querySelector<HTMLElement>('#view')!
const ui = document.querySelector<HTMLElement>('#ui')!
const orientation = matchMedia('(orientation: portrait)')
const campaign = new Campaign()
let config = loadConfig()
const audio = loadAudio()
let audioOpen = false
let active: RobotPartSlot = 'head'
let screen: Screen = 'title'
let stage: Stage | undefined
let alive = true
let frameId = 0
let battle: Battle | undefined
let hud: Hud | undefined
let paused: 'menu' | 'confirm' | false = false
let drag: { id: number; x: number } | undefined
const canPlay = () => alive && screen === 'battle' && !paused && !orientation.matches && !document.hidden
const touch = new TouchController(ui, canPlay)

function fail() {
  alive = false
  cancelAnimationFrame(frameId)
  clearInputs()
  ui.innerHTML = errorScreen()
}

function render() {
  if (!stage) return
  if (screen === 'title') ui.innerHTML = title(audio, audioOpen)
  if (screen === 'garage') ui.innerHTML = garage(stage, config, active, campaign.round)
  if (screen === 'intro') ui.innerHTML = intro(campaign.round)
  if (screen === 'battle') {
    ui.innerHTML = battleScreen(campaign.round)
    hud = new Hud(ui)
    if (battle) hud.update(battle)
  }
  if (screen === 'result' && battle) {
    ui.innerHTML = result(battle.status === 'won', battle.status === 'won' && campaign.round === 2)
  }
}

function clearInputs() { touch.clear(); drag = undefined }

function show(next: Screen) {
  clearInputs()
  paused = false
  screen = next
  if (screen === 'battle') battle = new Battle(campaign.round, config.weapon, campaign.losses)
  if (screen !== 'result') stage?.show(screen, config, campaign.round)
  if (screen === 'battle' && battle) stage?.updateBattle(0, battle)
  render()
}

function setPause(value: typeof paused) {
  paused = value
  clearInputs()
  ui.querySelector('.pause-overlay')?.remove()
  const play = ui.querySelector<HTMLElement>('.battle')
  if (play) play.inert = !!value
  if (value) {
    ui.insertAdjacentHTML('beforeend', pauseScreen(value === 'confirm'))
    ui.querySelector<HTMLButtonElement>('.pause-overlay .primary')?.focus()
  }
}

function goToTitle() { campaign.reset(); audioOpen = false; show('title') }

function handle(action: string) {
  if (action === 'reload') location.reload()
  if (!stage || !alive || orientation.matches) return
  if (action === 'play') { campaign.reset(); show('garage') }
  if (action === 'back') show(campaign.round === 0 ? 'title' : 'intro')
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
  if (action === 'finish' || action === 'retry') show('intro')
  if (action === 'start') show('battle')
  if (action === 'pause' || action === 'cancel-title') setPause('menu')
  if (action === 'resume') setPause(false)
  if (action === 'confirm-title') setPause('confirm')
  if (action === 'exit' || action === 'again') goToTitle()
  if (action === 'rebuild') { campaign.reset(); show('garage') }
  if (action === 'next' || action === 'refit') {
    if (screen === 'result' && battle?.status === 'won') campaign.advance()
    show(action === 'next' ? 'intro' : 'garage')
  }
}

ui.addEventListener('click', (event) => {
  const action = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')?.dataset.action
  if (action) {
    try { handle(action) } catch (error) { console.error(error); fail() }
  }
})

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
window.addEventListener('blur', clearInputs)
window.addEventListener('pagehide', clearInputs)
document.addEventListener('visibilitychange', clearInputs)

function rotateOverlay() {
  clearInputs()
  app.querySelector('.orientation')?.remove()
  ui.inert = orientation.matches
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
      const dt = Math.min(Math.max(0, (now - previous) / 1000), 0.08)
      previous = now
      try {
        if (canPlay() && battle) {
          battle.update(dt, touch.read())
          hud?.update(battle)
          stage?.updateBattle(dt, battle)
          if (battle.status !== 'playing') {
            if (battle.status === 'lost') campaign.lose()
            show('result')
          }
        }
        stage?.draw(dt, !paused && !orientation.matches && !document.hidden)
        frameId = requestAnimationFrame(loop)
      } catch (error) {
        console.error(error)
        fail()
      }
    }
    frameId = requestAnimationFrame(loop)
  } catch (error) {
    console.error(error)
    fail()
  }
}
requestAnimationFrame(() => requestAnimationFrame(init))
