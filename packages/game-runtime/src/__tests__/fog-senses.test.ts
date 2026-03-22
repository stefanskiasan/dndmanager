import { describe, it, expect } from 'vitest'
import { getVisionRange, canSeeInLight } from '../fog/senses.js'
import type { SenseType, LightLevel } from '../fog/types.js'

describe('getVisionRange', () => {
  it('normal vision: full range in bright light', () => {
    expect(getVisionRange('normal', 'bright', 60)).toBe(60)
  })

  it('normal vision: half range in dim light', () => {
    expect(getVisionRange('normal', 'dim', 60)).toBe(30)
  })

  it('normal vision: 0 range in darkness', () => {
    expect(getVisionRange('normal', 'darkness', 60)).toBe(0)
  })

  it('low-light vision: full range in bright and dim', () => {
    expect(getVisionRange('low-light', 'bright', 60)).toBe(60)
    expect(getVisionRange('low-light', 'dim', 60)).toBe(60)
  })

  it('low-light vision: 0 in darkness', () => {
    expect(getVisionRange('low-light', 'darkness', 60)).toBe(0)
  })

  it('darkvision: full range in all light levels', () => {
    expect(getVisionRange('darkvision', 'bright', 60)).toBe(60)
    expect(getVisionRange('darkvision', 'dim', 60)).toBe(60)
    expect(getVisionRange('darkvision', 'darkness', 60)).toBe(60)
  })
})

describe('canSeeInLight', () => {
  it('normal vision can see in bright', () => {
    expect(canSeeInLight('normal', 'bright')).toBe('visible')
  })

  it('normal vision sees dim in dim', () => {
    expect(canSeeInLight('normal', 'dim')).toBe('dim')
  })

  it('normal vision cannot see in darkness', () => {
    expect(canSeeInLight('normal', 'darkness')).toBe('hidden')
  })

  it('darkvision sees in darkness as dim', () => {
    expect(canSeeInLight('darkvision', 'darkness')).toBe('dim')
  })

  it('low-light treats dim as visible', () => {
    expect(canSeeInLight('low-light', 'dim')).toBe('visible')
  })
})
