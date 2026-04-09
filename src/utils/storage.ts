import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Storage Keys ────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  USER: 'user',
  SESSIONS: 'sessions',
  PRS: 'prs',
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Serialise `data` to JSON and persist it under `key`.
 * Throws if AsyncStorage write fails — let callers decide how to handle.
 */
export async function saveData<T>(key: string, data: T): Promise<void> {
  const json = JSON.stringify(data);
  await AsyncStorage.setItem(key, json);
}

/**
 * Load and deserialise the value stored under `key`.
 * Returns `fallback` when the key is missing or the stored value cannot be
 * parsed (e.g. corrupted data).
 */
export async function loadData<T>(key: string, fallback: T): Promise<T> {
  try {
    const json = await AsyncStorage.getItem(key);
    if (json === null) return fallback;
    return JSON.parse(json) as T;
  } catch {
    // Corrupted entry — treat as missing
    return fallback;
  }
}

/**
 * Remove a single key from AsyncStorage.
 */
export async function removeData(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/**
 * Wipe the entire AsyncStorage namespace.
 * Use with caution — this removes ALL keys, not just IronPath ones.
 */
export async function clearAll(): Promise<void> {
  await AsyncStorage.clear();
}
