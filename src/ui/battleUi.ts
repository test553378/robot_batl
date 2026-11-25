import { enemies, rules } from '../battle/battleBalance'
import type { Battle } from '../battle/battle'
import { enemyNames, type EnemyModel } from '../robots/enemy'

function health(label: string, key: string, max: number) {
  return `<div class="health ${key}"><div class="heart" aria-hidden="true">♥</div><div class="health-main">
    <b>${label}</b><div class="health-track" role="meter" aria-label="${label}の たいりょく" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${max}" data-meter="${key}"><span></span></div>
  </div></div>`
}

export function battleScreen(round: EnemyModel) {
  const directions = [['up', '▲', 'うえ'], ['left', '◀', 'ひだり'], ['right', '▶', 'みぎ'], ['down', '▼', 'した']]
  return `
    <section class="screen battle">
      <div class="hud">
        ${health('きみのロボ', 'player', rules.playerHp)}
        <div class="round-pill">${round + 1}かいせん</div>
        ${health(enemyNames[round], 'enemy', enemies[round].maxHp)}
        <button class="utility pause icon-button" data-action="pause" aria-label="いちじていし"><span aria-hidden="true">Ⅱ</span></button>
      </div>
      <div class="directions" aria-label="うごく">
        ${directions.map(([id, symbol, label]) => `<button class="direction ${id}" data-control="${id}" aria-label="${label}">${symbol}</button>`).join('')}
        <span class="direction-center" aria-hidden="true">◆</span>
      </div>
      <div class="weapon-buttons">
        <button class="special" data-control="special" aria-label="ひっさつ" disabled>
          <span aria-hidden="true">★</span><b>ひっさつ</b><i></i>
        </button>
        <button class="attack" data-control="attack" aria-label="こうげき">
          <span aria-hidden="true">✷</span><b>こうげき</b>
        </button>
      </div>
    </section>`
}

export class Hud {
  private readonly player: HTMLElement
  private readonly enemy: HTMLElement
  private readonly special: HTMLButtonElement
  private readonly attack: HTMLButtonElement

  constructor(ui: HTMLElement) {
    this.player = ui.querySelector('[data-meter="player"]')!
    this.enemy = ui.querySelector('[data-meter="enemy"]')!
    this.special = ui.querySelector('[data-control="special"]')!
    this.attack = ui.querySelector('[data-control="attack"]')!
  }

  private meter(element: HTMLElement, value: number, max: number) {
    const rounded = Math.ceil(value).toString()
    if (element.getAttribute('aria-valuenow') !== rounded) {
      element.setAttribute('aria-valuenow', rounded)
      element.style.setProperty('--health', `${100 * value / max}%`)
    }
  }

  update(battle: Battle) {
    this.meter(this.player, battle.player.hp, rules.playerHp)
    this.meter(this.enemy, battle.enemy.hp, battle.cpu.definition.maxHp)
    this.special.disabled = !battle.specialReady
    this.special.style.setProperty('--gauge', `${battle.gauge}%`)
    this.attack.toggleAttribute('data-fired', battle.player.recoil > 0)
  }
}

export function result(won: boolean, final: boolean) {
  const heading = final ? 'ぜんぶかった！' : won ? 'かった！' : 'もういっかい！'
  return `<section class="screen result ${won ? 'result-win' : 'result-lose'}">
    <div class="result-card">
      <div class="result-mark" aria-hidden="true">${final ? '★ ★ ★' : won ? '★' : '↻'}</div>
      <h1>${heading}</h1>
      <div class="result-buttons">
        <button class="primary" data-action="${final ? 'again' : won ? 'next' : 'retry'}">
          <span aria-hidden="true">${won ? '▶' : '↻'}</span> ${final ? 'もういちど' : won ? 'つぎへ' : 'もういっかい'}
        </button>
        <button class="utility" data-action="${final ? 'rebuild' : 'refit'}"><span aria-hidden="true">◆</span> ${final ? 'ロボをつくる' : 'ロボをかえる'}</button>
      </div>
    </div>
  </section>`
}

export function pauseScreen(confirm: boolean) {
  return `<div class="pause-overlay" role="dialog" aria-modal="true" aria-label="いちじていし">
    <div class="pause-card"><h1>${confirm ? 'タイトルへ もどる？' : 'ひとやすみ'}</h1>
      ${confirm ? `<button class="primary" data-action="cancel-title">やめる</button>
        <button class="utility" data-action="exit">タイトルへ</button>` :
        `<button class="primary" data-action="resume"><span aria-hidden="true">▶</span> つづける</button>
         <button class="utility" data-action="retry">やりなおす</button>
         <button class="utility" data-action="confirm-title">タイトルへ</button>`}
    </div>
  </div>`
}
