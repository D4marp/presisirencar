export type SessionUser = { username: string; name: string; role: string };

const TOKEN_KEY = "presisi_token";
const USER_KEY = "presisi_user";

// Default mengikuti host halaman, jadi 127.0.0.1 dan localhost sama-sama bekerja.
export function apiBase() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `http://${window.location.hostname}:8080/api`;
  return "http://127.0.0.1:8080/api";
}

export function getSession(): { token: string; user: SessionUser } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    return token && user ? { token, user: JSON.parse(user) } : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export class UnauthorizedError extends Error {}

export async function authedFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.token}` } : {}), ...init.headers },
  });
  if (res.status === 401) throw new UnauthorizedError("Sesi berakhir, silakan login kembali");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Permintaan gagal");
  return data as T;
}
