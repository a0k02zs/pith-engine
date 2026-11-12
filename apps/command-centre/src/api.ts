import { useCallback, useEffect, useState } from "react";

const USER_KEY = "pith.cc.user";

export function currentUserId(): string {
  try {
    return localStorage.getItem(USER_KEY) ?? "u-boss";
  } catch {
    return "u-boss";
  }
}

export function setCurrentUserId(id: string) {
  try {
    localStorage.setItem(USER_KEY, id);
  } catch {
    /* private mode: keep the default user */
  }
  window.dispatchEvent(new Event("pith:refresh"));
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Preview build (VITE_PREVIEW=1): the API and the test-data store run inside the browser,
// so the app works as a single static page with no server. Data resets on reload.
export const PREVIEW = import.meta.env.VITE_PREVIEW === "1";
let previewApp: Promise<{ request: (url: string, init?: RequestInit) => Response | Promise<Response> }> | null = null;
function localApp() {
  previewApp ??= Promise.all([import("../server/app"), import("../server/store")]).then(([a, s]) => a.createApp(new s.Store()));
  return previewApp;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const req: RequestInit = {
    ...init,
    headers: { "content-type": "application/json", "x-pith-user": currentUserId(), ...(init.headers ?? {}) },
  };
  const res = PREVIEW ? await (await localApp()).request(`/api${path}`, req) : await fetch(`/api${path}`, req);
  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/session") window.dispatchEvent(new Event("pith:signed-out"));
  if (!res.ok) throw new HttpError(res.status, (body as { error?: string }).error ?? res.statusText);
  return body as T;
}

export async function post<T>(path: string, body: unknown = {}): Promise<T> {
  return send<T>("POST", path, body);
}

/** Sends a change (POST, PUT or DELETE) and tells every open view to reload. */
export async function send<T>(method: "POST" | "PUT" | "DELETE", path: string, body: unknown = {}): Promise<T> {
  const out = await api<T>(path, { method, body: method === "DELETE" ? undefined : JSON.stringify(body) });
  window.dispatchEvent(new Event("pith:refresh"));
  return out;
}

/** Loads a GET endpoint and reloads it after any change made in the app. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    const on = () => reload();
    window.addEventListener("pith:refresh", on);
    return () => window.removeEventListener("pith:refresh", on);
  }, [reload]);
  useEffect(() => {
    if (!path) return;
    let live = true;
    api<T>(path)
      .then((d) => live && (setData(d), setError(null)))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [path, tick]);
  return { data, error, reload };
}
