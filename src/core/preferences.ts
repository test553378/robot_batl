import { defaultConfig, recoverConfig, type RobotConfig } from '../robots/catalog'

export interface AudioSettings { music: boolean; effects: boolean; voice: boolean }
export const defaultAudio: AudioSettings = { music: true, effects: true, voice: true }

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* The game can run without storage. */ }
}

export function loadConfig() {
  return recoverConfig(read('rescue-mecha.parts.v1') ?? defaultConfig)
}

export function saveConfig(config: RobotConfig) {
  write('rescue-mecha.parts.v1', config)
}

export function loadAudio() {
  const saved = read('rescue-mecha.audio.v1')
  const settings = { ...defaultAudio }
  if (typeof saved === 'object' && saved !== null) {
    for (const key of Object.keys(settings) as (keyof AudioSettings)[]) {
      const value: unknown = (saved as Record<string, unknown>)[key]
      if (typeof value === 'boolean') settings[key] = value
    }
  }
  return settings
}

export function saveAudio(settings: AudioSettings) {
  write('rescue-mecha.audio.v1', settings)
}
