const API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL ?? 'http://localhost:3000/v1';
const TOKEN_KEY = 'alphame_admin_access_token';

export type AdminSession = { accessToken: string; admin: { id: string; username: string; role: string } };
export type AdminStats = { users: number; generations: number; succeeded: number; processing: number; coinCharged: number };
export type AdminTemplate = { id: string; slug: string; nameVi: string; nameZh: string; prompt: string; coverUrl?: string; coinCost: number; sortOrder: number; enabled: boolean };
export type AdminGeneration = { id: string; status: string; coinCost: number; sourceAssetUrl: string; resultAssetUrl?: string; createdAt: string; user: { displayName?: string; zaloOpenId: string }; template: { slug: string; nameVi: string; nameZh: string } };
export type AdminUser = { id: string; zaloOpenId: string; displayName?: string; avatarUrl?: string; language: string; createdAt: string; coinAccount?: { available: number; frozen: number } };
export type AdminApiKey = { id: string; label: string; priority: number; status: string; failureCount: number; lastUsedAt?: string; pausedUntil?: string; createdAt: string };
export type AdminStorage = { provider: string; enabled: boolean; fallbackLocal: boolean; qiniuPrivate: boolean; qiniuUrlTtlSeconds: number; qiniuBucket?: string; qiniuRegion?: string; qiniuDomain?: string; qiniuAccessKey: boolean; qiniuSecretKey: boolean };

export function getAdminToken() { return sessionStorage.getItem(TOKEN_KEY); }
export function clearAdminToken() { sessionStorage.removeItem(TOKEN_KEY); }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers } });
  if (response.status === 401) { clearAdminToken(); throw new Error('ADMIN_UNAUTHORIZED'); }
  if (!response.ok) throw new Error(`Admin API ${response.status}`);
  return response.json() as Promise<T>;
}

export async function login(username: string, password: string) { const session = await request<AdminSession>('/admin/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); sessionStorage.setItem(TOKEN_KEY, session.accessToken); return session; }
export const getStats = () => request<AdminStats>('/admin/stats');
export const getTemplates = () => request<AdminTemplate[]>('/admin/templates');
export const getGenerations = () => request<AdminGeneration[]>('/admin/generations');
export const getUsers = () => request<AdminUser[]>('/admin/users');
export const getApiKeys = () => request<AdminApiKey[]>('/admin/api-keys');
export const uploadTemplateCover = (dataUrl: string) => request<{ id: string; publicUrl: string }>('/admin/template-covers', { method: 'POST', body: JSON.stringify({ dataUrl }) });
export const createTemplate = (body: { slug: string; nameVi: string; nameZh: string; prompt: string; coinCost: number; coverUrl?: string }) => request<AdminTemplate>('/admin/templates', { method: 'POST', body: JSON.stringify(body) });
export const updateTemplate = (id: string, body: { nameVi: string; nameZh: string; prompt: string; coinCost: number; coverUrl?: string }) => request<AdminTemplate>(`/admin/templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const reorderTemplates = (templateIds: string[]) => request<AdminTemplate[]>('/admin/templates/order', { method: 'PATCH', body: JSON.stringify({ templateIds }) });
export const toggleTemplate = (id: string, enabled: boolean) => request<AdminTemplate>(`/admin/templates/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
export const createApiKey = (body: { label: string; value: string; priority: number }) => request<AdminApiKey>('/admin/api-keys', { method: 'POST', body: JSON.stringify(body) });
export const updateApiKey = (id: string, status: 'ACTIVE' | 'PAUSED') => request<AdminApiKey>(`/admin/api-keys/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const getStorage = () => request<AdminStorage>('/admin/storage');
export const updateStorage = (body: Record<string, unknown>) => request<AdminStorage>('/admin/storage', { method: 'PATCH', body: JSON.stringify(body) });
export const testStorage = (body: Record<string, unknown>) => request<{ ok: boolean; message: string }>('/admin/storage/test', { method: 'POST', body: JSON.stringify(body) });
