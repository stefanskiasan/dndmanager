import { describe, it, expect } from 'vitest'
import { degreeOfSuccess, resolveCheck } from '../checks.js'

describe('degreeOfSuccess', () => {
  it('critical success when total >= DC + 10', () => {
    expect(degreeOfSuccess(30, 20, 15)).toBe('critical-success')
  })

  it('natural 20 upgrades failure to success', () => {
    // total = 25 vs DC 30 → base failure, nat 20 upgrades to success
    expect(degreeOfSuccess(20, 5, 30)).toBe('success')
  })

  it('natural 20 upgrades success to critical success', () => {
    // total = 30 vs DC 25 → base success, nat 20 upgrades to critical success
    expect(degreeOfSuccess(20, 10, 25)).toBe('critical-success')
  })

  it('success when total >= DC', () => {
    expect(degreeOfSuccess(15, 10, 20)).toBe('success')
  })

  it('success when total equals DC exactly', () => {
    expect(degreeOfSuccess(10, 10, 20)).toBe('success')
  })

  it('failure when total < DC', () => {
    expect(degreeOfSuccess(5, 10, 20)).toBe('failure')
  })

  it('critical failure when total <= DC - 10', () => {
    expect(degreeOfSuccess(5, 0, 20)).toBe('critical-failure')
  })

  it('critical failure on natural 1 even if would succeed', () => {
    expect(degreeOfSuccess(1, 25, 20)).toBe('failure')
  })

  it('natural 1 downgrades success to failure', () => {
    expect(degreeOfSuccess(1, 25, 20)).toBe('failure')
  })

  it('natural 1 downgrades critical success to success', () => {
    expect(degreeOfSuccess(1, 35, 25)).toBe('success')
  })

  it('natural 1 downgrades failure to critical failure', () => {
    expect(degreeOfSuccess(1, 5, 15)).toBe('critical-failure')
  })
})

describe('resolveCheck', () => {
  it('returns full check result', () => {
    const result = resolveCheck({
      naturalRoll: 15,
      modifier: 10,
      dc: 20,
    })
    expect(result.naturalRoll).toBe(15)
    expect(result.totalModifier).toBe(10)
    expect(result.total).toBe(25)
    expect(result.dc).toBe(20)
    expect(result.degree).toBe('success')
  })

  it('nat 20 with low modifier upgrades by one step', () => {
    const result = resolveCheck({
      naturalRoll: 20,
      modifier: 0,
      dc: 25,
    })
    // total 20 vs DC 25 = failure, nat 20 upgrades to success
    expect(result.degree).toBe('success')
  })
})
