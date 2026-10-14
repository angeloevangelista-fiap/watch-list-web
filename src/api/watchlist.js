import { ApiError, request } from './client'
import { RESOURCE } from '../features'

// Fields the client is allowed to send. The id is stripped before PUT.
const EDITABLE = ['title', 'year', 'genre', 'posterUrl', 'notes', 'watched', 'rating']

export function toPayload(item) {
  return Object.fromEntries(EDITABLE.filter((k) => k in item).map((k) => [k, item[k]]))
}

/**
 * Lists items. Phase 1 sends no params; with the filtering feature on it sends
 * ?q=&watched= (empty ones are left out). Expects a plain JSON array.
 */
export async function listItems(filters) {
  const query = {}
  if (filters) {
    query.q = filters.q.trim()
    if (filters.status !== 'all') query.watched = filters.status === 'watched'
  }

  const { data } = await request('GET', RESOURCE, { query })
  if (!Array.isArray(data)) throw new ApiError(`GET ${RESOURCE} should return a JSON array.`, 200, data)
  return data
}

export const getStats = async () => (await request('GET', `${RESOURCE}/stats`)).data

export const createItem = async (payload) =>
  (await request('POST', RESOURCE, { body: payload })).data

export const updateItem = async (id, payload) =>
  (await request('PUT', `${RESOURCE}/${id}`, { body: payload })).data

export const patchItem = async (id, partial) =>
  (await request('PATCH', `${RESOURCE}/${id}`, { body: partial })).data

export const deleteItem = async (id) => {
  await request('DELETE', `${RESOURCE}/${id}`)
}

/**
 * Changes a few fields of an item. With the PATCH feature on, only the changed
 * fields are sent; otherwise (Phase 1) the whole object goes through PUT.
 * Falls back to a local merge if the API answers without a body (e.g. 204).
 */
export async function changeItem(item, changes, usePatch) {
  const saved = usePatch
    ? await patchItem(item.id, changes)
    : await updateItem(item.id, toPayload({ ...item, ...changes }))
  return saved && typeof saved === 'object' ? saved : { ...item, ...changes }
}
