import type {
  MeshyCreateTaskRequest,
  MeshyTaskResponse,
} from '../types'

const MESHY_BASE_URL = 'https://api.meshy.ai/openapi/v2'

export interface PollOptions {
  intervalMs?: number
  maxAttempts?: number
  onProgress?: (progress: number, status: string) => void
}

export interface MeshyClient {
  createTextTo3DTask(request: MeshyCreateTaskRequest): Promise<string>
  getTask(taskId: string): Promise<MeshyTaskResponse>
  pollUntilComplete(taskId: string, options?: PollOptions): Promise<MeshyTaskResponse>
  downloadGlb(url: string): Promise<Buffer>
}

/**
 * Creates a Meshy API client.
 * Requires MESHY_API_KEY environment variable.
 */
export function createMeshyClient(): MeshyClient {
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) {
    throw new Error(
      'MESHY_API_KEY is not set. Add it to your .env.local file.'
    )
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  async function createTextTo3DTask(request: MeshyCreateTaskRequest): Promise<string> {
    const response = await fetch(`${MESHY_BASE_URL}/text-to-3d`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Meshy API error (${response.status}): ${body}`)
    }

    const data = await response.json() as { result: string }
    return data.result
  }

  async function getTask(taskId: string): Promise<MeshyTaskResponse> {
    const response = await fetch(`${MESHY_BASE_URL}/text-to-3d/${taskId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Meshy API error (${response.status}): ${body}`)
    }

    return response.json() as Promise<MeshyTaskResponse>
  }

  async function pollUntilComplete(
    taskId: string,
    options: PollOptions = {}
  ): Promise<MeshyTaskResponse> {
    const { intervalMs = 5000, maxAttempts = 120, onProgress } = options

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const task = await getTask(taskId)

      onProgress?.(task.progress, task.status)

      if (task.status === 'SUCCEEDED') return task
      if (task.status === 'FAILED') {
        throw new Error(`Meshy task failed: ${task.task_error?.message ?? 'unknown error'}`)
      }
      if (task.status === 'EXPIRED') {
        throw new Error('Meshy task expired')
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    throw new Error(`Meshy task timed out after ${maxAttempts} attempts`)
  }

  async function downloadGlb(url: string): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download GLB: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  return { createTextTo3DTask, getTask, pollUntilComplete, downloadGlb }
}
