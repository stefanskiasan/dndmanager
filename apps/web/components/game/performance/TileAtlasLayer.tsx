'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/lib/stores/game-store'
import { buildColorAtlas } from '@/lib/three-utils/texture-atlas'
import { TILE_COLORS } from '../MapLayer'

const TILE_SIZE = 1

/**
 * Renders the entire map as a single mesh using a texture atlas.
 * Each tile's UVs point to the correct region of the atlas.
 * This reduces draw calls from width*height to 1.
 *
 * Falls back gracefully if the atlas fails to build.
 */
export function TileAtlasLayer() {
  const mapSize = useGameStore((s) => s.mapSize)
  const mapTiles = useGameStore((s) => s.mapTiles)

  const { geometry, atlas } = useMemo(() => {
    const atlasResult = buildColorAtlas(TILE_COLORS)
    const entry = atlasResult.entries.get(mapTiles) ?? atlasResult.entries.values().next().value

    if (!entry) {
      return { geometry: null, atlas: atlasResult }
    }

    const width = mapSize[0]
    const height = mapSize[1]
    const tileCount = width * height

    // Build merged geometry: one quad per tile
    const positions = new Float32Array(tileCount * 4 * 3) // 4 vertices per tile, 3 components
    const uvs = new Float32Array(tileCount * 4 * 2)       // 4 vertices per tile, 2 UV components
    const indices: number[] = []

    const tileScale = TILE_SIZE * 0.98
    const halfTile = tileScale / 2

    for (let tx = 0; tx < width; tx++) {
      for (let ty = 0; ty < height; ty++) {
        const tileIndex = tx * height + ty
        const vertexOffset = tileIndex * 4

        // Four corners of the tile (rotated to lie flat on XZ plane)
        const cx = tx * TILE_SIZE
        const cz = ty * TILE_SIZE
        const y = 0

        // Vertex positions (XZ plane, Y=0)
        const pi = tileIndex * 4 * 3
        // Bottom-left
        positions[pi]     = cx - halfTile; positions[pi + 1] = y; positions[pi + 2] = cz - halfTile
        // Bottom-right
        positions[pi + 3] = cx + halfTile; positions[pi + 4] = y; positions[pi + 5] = cz - halfTile
        // Top-right
        positions[pi + 6] = cx + halfTile; positions[pi + 7] = y; positions[pi + 8] = cz + halfTile
        // Top-left
        positions[pi + 9] = cx - halfTile; positions[pi + 10] = y; positions[pi + 11] = cz + halfTile

        // UVs pointing to the atlas entry for this tile type
        const ui = tileIndex * 4 * 2
        uvs[ui]     = entry.uOffset;                uvs[ui + 1] = entry.vOffset
        uvs[ui + 2] = entry.uOffset + entry.uScale; uvs[ui + 3] = entry.vOffset
        uvs[ui + 4] = entry.uOffset + entry.uScale; uvs[ui + 5] = entry.vOffset + entry.vScale
        uvs[ui + 6] = entry.uOffset;                uvs[ui + 7] = entry.vOffset + entry.vScale

        // Two triangles per tile
        indices.push(
          vertexOffset, vertexOffset + 1, vertexOffset + 2,
          vertexOffset, vertexOffset + 2, vertexOffset + 3,
        )
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    return { geometry: geo, atlas: atlasResult }
  }, [mapSize, mapTiles])

  if (!geometry || !atlas) return null

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial map={atlas.texture} />
    </mesh>
  )
}
