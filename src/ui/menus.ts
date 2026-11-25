import type { AudioSettings } from '../core/preferences'
import type { Stage } from '../core/stage'
import { partsFor, slotNames, slots, themeNames, weaponNames, type RobotConfig, type RobotPartSlot, type Theme, type WeaponId } from '../robots/catalog'
import { enemyNames } from '../robots/enemy'

export function title(settings: AudioSettings, audioOpen: boolean) {
  const toggles = [
    ['music', 'おんがく', '♫'],
    ['effects', 'こうかおん', '✦'],
    ['voice', 'こえ', '♪'],
  ] as const
  return `
    <section class="screen title">
      <div class="title-copy">
        <div class="title-mark" aria-hidden="true"><span></span>✦<span></span></div>
        <h1>レスキューメカ<span>バトル！</span></h1>
        <button class="primary start" data-action="play"><span aria-hidden="true">▶</span> あそぶ</button>
      </div>
      <button class="utility sound" data-action="audio" aria-expanded="${audioOpen}"><span aria-hidden="true">♫</span> おと</button>
      ${audioOpen ? `<div class="sound-panel">${toggles.map(([key, label, icon]) =>
        `<button class="toggle" data-action="audio-${key}" aria-pressed="${settings[key]}"><span aria-hidden="true">${icon}</span> ${label} <b>${settings[key] ? 'ON' : 'OFF'}</b></button>`).join('')}</div>` : ''}
    </section>`
}

export function garage(stage: Stage, config: RobotConfig, active: RobotPartSlot, nextRound: number) {
  return `
    <section class="screen workshop">
      <div class="workshop-heading">
        <button class="utility icon-button" data-action="back" aria-label="もどる">‹</button>
        <h1>ロボットを つくろう！</h1>
      </div>
      <div class="spin" data-rotate aria-label="ロボットの回転エリア"></div>
      <div class="spin-controls">
        <button class="utility icon-button" data-action="left" aria-label="ひだりに まわす">↶</button>
        <button class="utility icon-button" data-action="right" aria-label="みぎに まわす">↷</button>
      </div>
      <div class="parts-panel">
        <div class="part-tabs" aria-label="ぶひん">
          ${slots.map((slot) => `<button class="part-tab" data-action="slot-${slot}" aria-pressed="${active === slot}"><i class="part-icon ${slot}" aria-hidden="true"></i>${slotNames[slot]}</button>`).join('')}
        </div>
        <div class="part-options" aria-label="${slotNames[active]}">
          ${partsFor(active).map((id) => {
            const label = active === 'weapon' ? weaponNames[id as WeaponId] : themeNames[id as Theme]
            return `<button class="part-option" data-action="part-${id}" data-theme="${id}" aria-pressed="${config[active] === id}"><img draggable="false" alt="" src="${stage.thumbnail(active, id)}"><span>${label}</span></button>`
          }).join('')}
        </div>
        <button class="primary finish" data-action="finish"><span aria-hidden="true">✦</span> かんせい！${nextRound > 0 ? `<small>${nextRound + 1}かいせん</small>` : ''}</button>
      </div>
    </section>`
}

export function intro(round: number) {
  return `
    <section class="screen intro">
      <button class="utility icon-button" data-action="refit" aria-label="もどる">‹</button>
      <div class="intro-card">
        <div class="round-pill"><span aria-hidden="true">⚑</span> ${round + 1}かいせん</div>
        <h1>${enemyNames[round]}</h1>
        <div class="round-dots" aria-label="ぜんぶで 3かい">${[0, 1, 2].map((index) => `<span class="${index <= round ? 'lit' : ''}"></span>`).join('')}</div>
        <button class="primary" data-action="start"><span aria-hidden="true">▶</span> スタート！</button>
      </div>
    </section>`
}

export function errorScreen() {
  return `<div class="screen-error" role="alert"><strong aria-hidden="true">✦</strong>
    <h1>3Dを ひらけなかったよ</h1>
    <p>WebGL 2 に対応したブラウザで、もういちど ひらいてね。</p>
    <button class="primary" data-action="reload">もういちど</button>
  </div>`
}
