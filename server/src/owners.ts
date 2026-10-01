import { renderApi } from './renderApi.js'

let cachedOwnerId: string | null = null

export async function getDefaultOwnerId(): Promise<string> {
  if (cachedOwnerId) return cachedOwnerId

  const owners = await renderApi<Array<{ owner: { id: string } }>>(undefined as any, {
    path: '/owners',
  })

  if (!owners.length) {
    throw new Error('No workspaces found for this API key')
  }

  if (owners.length > 1) {
    throw new Error(
      'Multiple workspaces found. Please specify ownerId for logs queries.',
    )
  }

  cachedOwnerId = owners[0].owner.id
  return cachedOwnerId
}
