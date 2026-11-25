import type { Battle } from '../battle/battle'
import type { AudioSettings } from '../core/preferences'

export type MusicMode = 'garage' | 'battle' | 'result'
const garageTune = [60, 67, 72, 67, 62, 69, 74, 69, 64, 71, 76, 71, 62, 67, 74, 67]
const arenaTune = [48, 60, 55, 62, 51, 63, 58, 65, 46, 58, 53, 60, 48, 60, 55, 67]
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12)

export class Sound {
  private ctx?: AudioContext
  private music?: GainNode
  private effects?: GainNode
  private noise?: AudioBuffer
  private next = 0
  private beat = 0
  private mode: MusicMode = 'garage'
  private active = true

  constructor(private readonly settings: AudioSettings) {}

  unlock() {
    try {
      if (!this.ctx) {
        const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Context) return
        this.ctx = new Context()
        this.music = this.ctx.createGain()
        this.effects = this.ctx.createGain()
        const limit = this.ctx.createDynamicsCompressor()
        this.music.connect(limit)
        this.effects.connect(limit)
        limit.connect(this.ctx.destination)
        this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.32, this.ctx.sampleRate)
        const samples = this.noise.getChannelData(0)
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
        this.apply()
      }
      if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => {})
    } catch {
      // Audio is optional on browser versions that do not allow initialization.
    }
  }

  apply() {
    if (!this.settings.voice || !this.active) window.speechSynthesis?.cancel()
    if (!this.ctx) return
    const now = this.ctx.currentTime
    this.music?.gain.setTargetAtTime(this.settings.music && this.active ? 0.21 : 0, now, 0.055)
    this.effects?.gain.setTargetAtTime(this.settings.effects && this.active ? 0.37 : 0, now, 0.025)
  }

  setActive(value: boolean) {
    if (this.active === value) return
    this.active = value
    this.apply()
  }

  setMode(mode: MusicMode) {
    if (this.mode === mode) return
    this.mode = mode
    this.beat = 0
    this.next = 0
  }

  say(text: string) {
    if (!this.settings.voice || !this.active || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return
    try {
      const speech = window.speechSynthesis
      const japanese = speech.getVoices().find((voice) => /^ja(-|$)/i.test(voice.lang))
      if (!japanese) return
      speech.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = japanese
      utterance.lang = 'ja-JP'
      utterance.rate = 0.9
      utterance.volume = 0.68
      speech.speak(utterance)
    } catch {
      // A disconnected speech service cannot interrupt the game.
    }
  }

  private tone(from: number, to: number, duration: number, volume: number, wave: OscillatorType = 'sine',
    at = this.ctx?.currentTime ?? 0, output = this.effects) {
    if (!this.ctx || !output || this.ctx.state !== 'running' || !this.active) return
    const oscillator = this.ctx.createOscillator()
    const envelope = this.ctx.createGain()
    oscillator.type = wave
    oscillator.frequency.setValueAtTime(from, at)
    oscillator.frequency.exponentialRampToValueAtTime(to, at + duration)
    envelope.gain.setValueAtTime(0.001, at)
    envelope.gain.exponentialRampToValueAtTime(volume, at + Math.min(0.022, duration / 4))
    envelope.gain.exponentialRampToValueAtTime(0.001, at + duration)
    oscillator.connect(envelope).connect(output)
    oscillator.start(at)
    oscillator.stop(at + duration + 0.015)
  }

  private hiss(frequency: number, duration: number, volume: number) {
    if (!this.ctx || !this.effects || !this.noise || this.ctx.state !== 'running' || !this.active) return
    const source = this.ctx.createBufferSource()
    const filter = this.ctx.createBiquadFilter()
    const envelope = this.ctx.createGain()
    const now = this.ctx.currentTime
    source.buffer = this.noise
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(frequency, now)
    filter.frequency.exponentialRampToValueAtTime(frequency * 0.42, now + duration)
    envelope.gain.setValueAtTime(volume, now)
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration)
    source.connect(filter).connect(envelope).connect(this.effects)
    source.start(now, 0, duration)
  }

  button() { if (this.settings.effects) this.tone(530, 710, 0.077, 0.18, 'triangle') }

  equip() {
    if (!this.settings.effects) return
    const now = this.ctx?.currentTime ?? 0
    this.tone(440, 610, 0.12, 0.28, 'triangle', now)
    this.tone(880, 1180, 0.20, 0.21, 'sine', now + 0.083)
  }

  finish(won: boolean, final: boolean) {
    if (!this.settings.effects) return
    const now = this.ctx?.currentTime ?? 0
    const notes = won ? final ? [60, 64, 67, 72, 76, 79] : [60, 64, 67, 72] : [67, 64, 60]
    notes.forEach((note, index) => this.tone(hz(note), hz(note), 0.27, 0.28, 'triangle', now + index * 0.102))
  }

  simulate(battle: Battle) {
    if (!this.settings.effects) return
    for (const event of battle.events) {
      if (event.kind === 'step') this.hiss(310, 0.07, 0.12)
      if (event.kind === 'warning') this.tone(365, 640, 0.29, 0.20, 'triangle')
      if (event.kind === 'charge') this.tone(170, 790, 0.46, 0.28, 'triangle')
      if (event.kind === 'impact') {
        const pitch = event.owner === 'enemy' ? 155 : { beam: 340, water: 525, star: 690 }[battle.weaponId]
        this.hiss(event.special ? 2800 : 1280, event.special ? 0.24 : 0.11, 0.22)
        this.tone(pitch, pitch * 0.54, 0.16, 0.21, 'triangle')
      }
      if (event.kind === 'shot') {
        if (event.owner === 'enemy') this.tone(292, 112, 0.22, 0.21, 'triangle')
        else if (event.special) {
          this.tone(190, 47, 0.38, 0.42, 'sine')
          this.hiss(3800, 0.26, 0.32)
        } else if (battle.weaponId === 'beam') this.tone(960, 252, 0.16, 0.27, 'triangle')
        else if (battle.weaponId === 'water') {
          this.hiss(2390, 0.17, 0.33)
          this.tone(738, 436, 0.10, 0.20, 'sine')
        } else {
          this.tone(290, 840, 0.24, 0.25, 'triangle')
          this.tone(534, 1040, 0.17, 0.12, 'sine')
        }
      }
    }
  }

  update() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.active || !this.settings.music || this.mode === 'result') return
    const now = this.ctx.currentTime
    if (this.next < now - 0.1) this.next = now + 0.016
    if (this.next > now + 0.065) return
    const inBattle = this.mode === 'battle'
    const tune = inBattle ? arenaTune : garageTune
    const index = this.beat % tune.length
    const melody = hz(tune[index])
    this.tone(melody, melody, inBattle ? 0.16 : 0.27, index % 2 ? 0.20 : 0.29, 'triangle', this.next, this.music)
    if (index % 4 === 0) {
      const bass = hz(tune[index] - (inBattle ? 12 : 24))
      this.tone(bass, bass, 0.36, 0.50, 'sine', this.next, this.music)
    }
    this.next += inBattle ? 0.215 : 0.335
    this.beat++
  }
}
