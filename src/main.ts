import './ui/style.css'
import { Sound } from './audio/sound'
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
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const campaign = new Campaign()
let config = loadConfig()
const audio = loadAudio()
const sound = new Sound(audio)
let audioOpen = false
let active: RobotPartSlot = 'head'
let screen: Screen = 'title'
let stage: Stage | undefined
let alive = true
let frameId = 0
let resetClock = false
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
  sound.setActive(false)
  app.querySelector('.orientation')?.remove()
  ui.inert = false
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
  if (screen !== 'result') battle = undefined
  if (screen !== 'battle') hud = undefined
  if (screen === 'battle') battle = new Battle(campaign.round, config.weapon, campaign.losses)
  if (screen === 'result') stage?.beginResult()
  else stage?.show(screen, config, campaign.round)
  sound.setMode(screen === 'battle' ? 'battle' : screen === 'result' ? 'result' : 'garage')
  if (screen === 'garage') sound.say('ロボットをつくろう！')
  if (screen === 'intro') sound.say(['いっかいせん！', 'にかいせん！', 'さんかいせん！'][campaign.round])
  if (screen === 'battle') sound.say('バトル、スタート！')
  if (screen === 'result' && battle) {
    const won = battle.status === 'won'
    sound.finish(won, campaign.round === 2)
    if (won) sound.say(campaign.round === 2 ? 'ぜんぶクリア！' : 'かった！')
  }
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
  sound.unlock()
  sound.button()
  if (action === 'play') { campaign.reset(); show('garage') }
  if (action === 'back') show(campaign.round === 0 ? 'title' : 'intro')
  if (action === 'audio') { audioOpen = !audioOpen; render() }
  if (action.startsWith('audio-')) {
    const key = action.slice(6) as keyof AudioSettings
    audio[key] = !audio[key]
    saveAudio(audio)
    sound.apply()
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
      sound.equip()
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
app.addEventListener('pointerdown', () => { if (alive) sound.unlock() }, { capture: true })
app.addEventListener('contextmenu', (event) => event.preventDefault())
window.addEventListener('blur', clearInputs)
window.addEventListener('pagehide', clearInputs)
document.addEventListener('visibilitychange', () => {
  resetClock = true
  clearInputs()
  sound.setActive(alive && !document.hidden && !orientation.matches)
})

function rotateOverlay() {
  resetClock = true
  clearInputs()
  app.querySelector('.orientation')?.remove()
  if (!alive) return
  ui.inert = orientation.matches
  sound.setActive(!document.hidden && !orientation.matches)
  if (orientation.matches && stage) {
    app.insertAdjacentHTML('beforeend', `<div class="orientation" role="status"><img alt="" src="${stage.portrait()}"><span aria-hidden="true">↻</span><b>よこにしてね</b></div>`)
  }
  stage?.resize()
}
orientation.addEventListener('change', rotateOverlay)

function init() {
  try {
    const progress = ui.querySelector('progress')
    if (progress) progress.value = 2
    stage = new Stage(view, fail)
    new ResizeObserver(() => stage?.resize()).observe(view)
    show('title')
    rotateOverlay()
    let previous = performance.now()
    function loop(now: number) {
      if (!alive) return
      const frameSeconds = resetClock ? 0 : Math.max(0, (now - previous) / 1000)
      const dt = Math.min(frameSeconds, 0.36)
      previous = now
      resetClock = false
      try {
        if (canPlay() && battle && dt > 0) {
          battle.update(dt, touch.read())
          hud?.update(battle)
          stage?.updateBattle(dt, battle)
          sound.simulate(battle)
          if (battle.status !== 'playing') {
            if (battle.status === 'lost') campaign.lose()
            show('result')
          }
        }
        const animate = !paused && !orientation.matches && !document.hidden
        if (animate && screen === 'result' && battle) stage?.animateResult(dt, battle, reducedMotion.matches)
        if (!document.hidden && !orientation.matches) stage?.draw(dt, animate, frameSeconds)
        if (animate) sound.update()
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
