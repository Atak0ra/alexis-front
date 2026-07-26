const API_KEY_STORAGE = "alexis_api_key";
const KEY_ID_STORAGE = "alexis_key_id";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(API_KEY_STORAGE);
}

export function setApiKey(key: string): void {
  window.localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey(): void {
  window.localStorage.removeItem(API_KEY_STORAGE);
  window.localStorage.removeItem(KEY_ID_STORAGE);
}

export function getKeyId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_ID_STORAGE);
}

export function setKeyId(id: string): void {
  window.localStorage.setItem(KEY_ID_STORAGE, id);
}

const ADMIN_API_KEY_STORAGE = "alexis_admin_api_key";

export function getAdminApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ADMIN_API_KEY_STORAGE);
}

export function setAdminApiKey(key: string): void {
  window.localStorage.setItem(ADMIN_API_KEY_STORAGE, key);
}

export function clearAdminApiKey(): void {
  window.localStorage.removeItem(ADMIN_API_KEY_STORAGE);
}
