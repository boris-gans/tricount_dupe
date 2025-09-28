const GROUP_DETAILS_KEY = 'groupDetailsById'
const GROUP_NAME_MAP_KEY = 'groupNameToId'

function safeRead(key) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  } catch (err) {
    console.error('Failed to read storage key', key, err)
    return {}
  }
}

function safeWrite(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('Failed to write storage key', key, err)
  }
}

export function rememberGroupId(name, id) {
  if (!name || !id) return
  const map = safeRead(GROUP_NAME_MAP_KEY)
  map[name] = id
  safeWrite(GROUP_NAME_MAP_KEY, map)
}

export function getGroupIdByName(name) {
  if (!name) return null
  const map = safeRead(GROUP_NAME_MAP_KEY)
  return map[name] ?? null
}

export function saveGroupDetails(group) {
  if (!group?.id) return
  const cache = safeRead(GROUP_DETAILS_KEY)
  cache[group.id] = group
  safeWrite(GROUP_DETAILS_KEY, cache)
  rememberGroupId(group.name, group.id)
}

export function getCachedGroupDetailsById(id) {
  if (!id) return null
  const cache = safeRead(GROUP_DETAILS_KEY)
  return cache[id] ?? null
}

export function getCachedGroupDetailsByName(name) {
  const groupId = getGroupIdByName(name)
  if (!groupId) return null
  return getCachedGroupDetailsById(groupId)
}

export function syncGroupSummaries(groups) {
  if (!Array.isArray(groups)) return
  const map = safeRead(GROUP_NAME_MAP_KEY)
  for (const group of groups) {
    if (group?.name && group?.id) {
      map[group.name] = group.id
    }
  }
  safeWrite(GROUP_NAME_MAP_KEY, map)
}
