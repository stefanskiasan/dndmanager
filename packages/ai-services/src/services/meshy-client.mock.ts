import type { MeshyTaskResponse } from '../types'
import type { MeshyClient, PollOptions } from './meshy-client'

/**
 * Mock Meshy client for development/testing without an API key.
 * Returns a placeholder GLB URL after a simulated delay.
 */
export function createMockMeshyClient(): MeshyClient {
  const tasks = new Map<string, MeshyTaskResponse>()
  const callCount = new Map<string, number>()

  function createTextTo3DTask(): Promise<string> {
    const taskId = `mock-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const now = Date.now()

    tasks.set(taskId, {
      id: taskId,
      model_urls: {
        glb: '',
        fbx: '',
        obj: '',
        usdz: '',
      },
      thumbnail_url: '',
      prompt: '',
      art_style: 'realistic',
      negative_prompt: '',
      status: 'PENDING',
      created_at: now,
      started_at: 0,
      finished_at: 0,
      expires_at: now + 86400000,
      task_error: null,
      progress: 0,
    })
    callCount.set(taskId, 0)

    return Promise.resolve(taskId)
  }

  function getTask(taskId: string): Promise<MeshyTaskResponse> {
    const task = tasks.get(taskId)
    if (!task) {
      return Promise.reject(new Error(`Mock task not found: ${taskId}`))
    }

    const count = (callCount.get(taskId) ?? 0) + 1
    callCount.set(taskId, count)

    // Simulate progression: first call -> IN_PROGRESS, second call -> SUCCEEDED
    if (count === 1) {
      task.status = 'IN_PROGRESS'
      task.progress = 50
      task.started_at = Date.now()
    } else {
      task.status = 'SUCCEEDED'
      task.progress = 100
      task.finished_at = Date.now()
      task.model_urls = {
        glb: 'https://mock.meshy.ai/models/placeholder.glb',
        fbx: 'https://mock.meshy.ai/models/placeholder.fbx',
        obj: 'https://mock.meshy.ai/models/placeholder.obj',
        usdz: 'https://mock.meshy.ai/models/placeholder.usdz',
      }
      task.thumbnail_url = 'https://mock.meshy.ai/thumbnails/placeholder.png'
    }

    return Promise.resolve({ ...task })
  }

  async function pollUntilComplete(
    taskId: string,
    options: PollOptions = {}
  ): Promise<MeshyTaskResponse> {
    const { intervalMs = 100, maxAttempts = 10, onProgress } = options

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const task = await getTask(taskId)
      onProgress?.(task.progress, task.status)
      if (task.status === 'SUCCEEDED') return task
      if (task.status === 'FAILED') throw new Error('Mock task failed')
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
    throw new Error('Mock task timed out')
  }

  function downloadGlb(): Promise<Buffer> {
    // Return a minimal valid GLB header (12 bytes) for testing
    const header = Buffer.alloc(12)
    header.writeUInt32LE(0x46546C67, 0) // magic: glTF
    header.writeUInt32LE(2, 4)           // version: 2
    header.writeUInt32LE(12, 8)          // length: 12
    return Promise.resolve(header)
  }

  return { createTextTo3DTask, getTask, pollUntilComplete, downloadGlb }
}
