import * as THREE from 'three'

export interface AtlasEntry {
  key: string
  /** UV offset in the atlas (0-1 range) */
  uOffset: number
  vOffset: number
  /** UV scale (fraction of atlas this tile occupies) */
  uScale: number
  vScale: number
}

export interface TextureAtlas {
  texture: THREE.Texture
  entries: Map<string, AtlasEntry>
}

/**
 * Creates a canvas-based texture atlas from a set of tile colors/textures.
 * Each tile type gets a slot in the atlas grid.
 *
 * @param tileTypes - Map of tile key to color hex string
 * @param tileResolution - Pixel size per tile in atlas (default: 64)
 */
export function buildColorAtlas(
  tileTypes: Record<string, string>,
  tileResolution = 64,
): TextureAtlas {
  const keys = Object.keys(tileTypes)
  const gridSize = Math.ceil(Math.sqrt(keys.length))
  const atlasSize = gridSize * tileResolution

  const canvas = document.createElement('canvas')
  canvas.width = atlasSize
  canvas.height = atlasSize
  const ctx = canvas.getContext('2d')!

  const entries = new Map<string, AtlasEntry>()

  keys.forEach((key, i) => {
    const col = i % gridSize
    const row = Math.floor(i / gridSize)
    ctx.fillStyle = tileTypes[key]
    ctx.fillRect(col * tileResolution, row * tileResolution, tileResolution, tileResolution)

    entries.set(key, {
      key,
      uOffset: col / gridSize,
      vOffset: 1 - (row + 1) / gridSize, // flip Y for GL
      uScale: 1 / gridSize,
      vScale: 1 / gridSize,
    })
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter

  return { texture, entries }
}
