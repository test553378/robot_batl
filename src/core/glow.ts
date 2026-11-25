import * as T from 'three'

let texture: T.DataTexture | undefined

export function glowSprite(color: number) {
  if (!texture) {
    const size = 32
    const data = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const distance = Math.hypot((x + 0.5) / (size / 2) - 1, (y + 0.5) / (size / 2) - 1)
        const alpha = Math.max(0, 1 - distance) ** 2.6
        data.set([255, 255, 255, Math.round(alpha * 255)], (y * size + x) * 4)
      }
    }
    texture = new T.DataTexture(data, size, size)
    texture.magFilter = T.LinearFilter
    texture.needsUpdate = true
  }
  const material = new T.SpriteMaterial({
    color, map: texture, depthWrite: false, transparent: true, opacity: 0, blending: T.AdditiveBlending, toneMapped: false,
  })
  const sprite = new T.Sprite(material)
  sprite.visible = false
  return sprite
}

export function showGlow(sprite: T.Sprite, strength: number, size: number) {
  sprite.material.opacity = strength
  sprite.visible = strength > 0.012
  sprite.scale.setScalar(size)
}
