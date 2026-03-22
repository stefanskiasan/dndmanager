import * as THREE from 'three'

const _frustum = new THREE.Frustum()
const _projScreenMatrix = new THREE.Matrix4()

/**
 * Returns a Frustum built from the current camera's projection x view matrix.
 */
export function getCameraFrustum(camera: THREE.Camera): THREE.Frustum {
  _projScreenMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  )
  _frustum.setFromProjectionMatrix(_projScreenMatrix)
  return _frustum
}

/**
 * Tests whether a tile at grid position (x, y) is inside the camera frustum.
 * Uses a bounding sphere for speed (radius covers a 1x1 tile).
 */
const _sphere = new THREE.Sphere()
const TILE_SPHERE_RADIUS = 0.72 // sqrt(0.5^2 + 0.5^2) ~ 0.707

export function isTileVisible(
  frustum: THREE.Frustum,
  x: number,
  y: number,
): boolean {
  _sphere.center.set(x, 0, y)
  _sphere.radius = TILE_SPHERE_RADIUS
  return frustum.intersectsSphere(_sphere)
}
