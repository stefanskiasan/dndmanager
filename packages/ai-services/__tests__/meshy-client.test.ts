import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('MeshyClient', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('MESHY_API_KEY', 'test-key-123')
    mockFetch.mockReset()
  })

  it('createTextTo3DTask sends correct request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 'task-abc-123' }),
    })

    const { createMeshyClient } = await import('../src/services/meshy-client')
    const client = createMeshyClient()
    const taskId = await client.createTextTo3DTask({
      mode: 'preview',
      prompt: 'a brave elven warrior',
      art_style: 'realistic',
      negative_prompt: 'blurry, low quality',
    })

    expect(taskId).toBe('task-abc-123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.meshy.ai/openapi/v2/text-to-3d',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key-123',
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('getTask returns parsed task response', async () => {
    const taskResponse = {
      id: 'task-abc-123',
      status: 'SUCCEEDED',
      progress: 100,
      model_urls: { glb: 'https://assets.meshy.ai/model.glb', fbx: '', obj: '', usdz: '' },
      thumbnail_url: 'https://assets.meshy.ai/thumb.png',
      prompt: 'test',
      art_style: 'realistic',
      negative_prompt: '',
      created_at: 1000,
      started_at: 1001,
      finished_at: 1050,
      expires_at: 9999,
      task_error: null,
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => taskResponse,
    })

    const { createMeshyClient } = await import('../src/services/meshy-client')
    const client = createMeshyClient()
    const task = await client.getTask('task-abc-123')

    expect(task.status).toBe('SUCCEEDED')
    expect(task.model_urls.glb).toContain('.glb')
  })

  it('pollUntilComplete resolves on success', async () => {
    const pendingResponse = {
      id: 'task-1',
      status: 'IN_PROGRESS',
      progress: 50,
      model_urls: { glb: '', fbx: '', obj: '', usdz: '' },
      thumbnail_url: '',
      prompt: 'test',
      art_style: 'realistic',
      negative_prompt: '',
      created_at: 1000,
      started_at: 1001,
      finished_at: 0,
      expires_at: 9999,
      task_error: null,
    }
    const doneResponse = {
      ...pendingResponse,
      status: 'SUCCEEDED',
      progress: 100,
      model_urls: { glb: 'https://assets.meshy.ai/model.glb', fbx: '', obj: '', usdz: '' },
    }

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => pendingResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => doneResponse })

    const { createMeshyClient } = await import('../src/services/meshy-client')
    const client = createMeshyClient()
    const result = await client.pollUntilComplete('task-1', { intervalMs: 10, maxAttempts: 5 })

    expect(result.status).toBe('SUCCEEDED')
  })

  it('throws on missing API key', async () => {
    vi.stubEnv('MESHY_API_KEY', '')

    const { createMeshyClient } = await import('../src/services/meshy-client')
    expect(() => createMeshyClient()).toThrow('MESHY_API_KEY')
  })
})

describe('MockMeshyClient', () => {
  it('simulates a full generation cycle', async () => {
    const { createMockMeshyClient } = await import('../src/services/meshy-client.mock')
    const client = createMockMeshyClient()

    const taskId = await client.createTextTo3DTask({
      mode: 'preview',
      prompt: 'test character',
      art_style: 'realistic',
    })
    expect(taskId).toMatch(/^mock-task-/)

    const result = await client.pollUntilComplete(taskId, { intervalMs: 10, maxAttempts: 3 })
    expect(result.status).toBe('SUCCEEDED')
    expect(result.model_urls.glb).toContain('.glb')
  })
})
