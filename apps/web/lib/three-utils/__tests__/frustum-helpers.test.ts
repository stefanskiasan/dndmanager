import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { getCameraFrustum, isTileVisible } from '../frustum-helpers'

describe('frustum-helpers', () => {
  function createOrthoCamera(zoom: number, position: [number, number, number]) {
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000)
    camera.zoom = zoom
    camera.position.set(...position)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    camera.updateProjectionMatrix()
    return camera
  }

  describe('getCameraFrustum', () => {
    it('returns a Frustum object', () => {
      const camera = createOrthoCamera(1, [10, 10, 10])
      const frustum = getCameraFrustum(camera)
      expect(frustum).toBeInstanceOf(THREE.Frustum)
    })

    it('frustum has 6 planes', () => {
      const camera = createOrthoCamera(1, [10, 10, 10])
      const frustum = getCameraFrustum(camera)
      expect(frustum.planes).toHaveLength(6)
    })
  })

  describe('isTileVisible', () => {
    it('returns true for a tile at origin with camera looking at origin', () => {
      const camera = createOrthoCamera(1, [10, 10, 10])
      const frustum = getCameraFrustum(camera)
      expect(isTileVisible(frustum, 0, 0)).toBe(true)
    })

    it('returns false for a tile far outside the camera view', () => {
      const camera = createOrthoCamera(10, [0, 10, 0])
      camera.left = -1
      camera.right = 1
      camera.top = 1
      camera.bottom = -1
      camera.updateProjectionMatrix()
      const frustum = getCameraFrustum(camera)
      // Tile at (1000, 1000) should be outside a tightly bounded camera
      expect(isTileVisible(frustum, 1000, 1000)).toBe(false)
    })

    it('returns true for a tile within camera bounds', () => {
      const camera = createOrthoCamera(1, [5, 10, 5])
      camera.lookAt(5, 0, 5)
      camera.updateMatrixWorld()
      camera.updateProjectionMatrix()
      const frustum = getCameraFrustum(camera)
      expect(isTileVisible(frustum, 5, 5)).toBe(true)
    })
  })
})
