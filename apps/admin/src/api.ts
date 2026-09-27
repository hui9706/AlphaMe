const API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL ?? 'http://localhost:3000/v1';
const TOKEN_KEY = 'alphame_admin_access_token';

export type AdminSession = { accessToken: string; admin: { id: string; username: string; role: string } };
export type AdminStats = { users: number; generations: number; succeeded: number; processing: number; coinCharged: number };
export type AdminTemplate = { id: string; slug: string; nameVi: string; nameZh: string; prompt: string; coverUrl?: string; coinCost: number; sortOrder: number; enabled: boolean };
export type AdminGeneration = { id: string; status: string; coinCost: number; sourceAssetUrl: string; resultAssetUrl?: string; createdAt: string; user: { displayName?: string | null; zaloOpenId?: string | null }; template: { slug: string; nameVi: string; nameZh: string } };
export type AdminUser = { id: string; zaloOpenId?: string | null; displayName?: string | null; avatarUrl?: string | null; language: string; isAdmin: boolean; createdAt: string; coinAccount?: { available: number; frozen: number } | null };
export type AdminCoinAccount = { id: string; zaloOpenId?: string | null; displayName?: string | null; coinAccount?: { available: number; frozen: number; updatedAt: string; ledger: AdminLedgerEntry[] } | null };
export type AdminLedgerEntry = { id: string; type: string; amount: number; availableAfter: number; frozenAfter: number; note?: string | null; createdAt: string; rewardRecord?: { id: string; type: string; status: string; amount: number; sourceType: string; sourceId: string; note?: string | null; revokedAt?: string | null; revokeReason?: string | null } | null; adminUser?: { id: string; username: string } | null };
export type AdminReward = { id: string; type: string; status: string; amount: number; sourceType: string; sourceId: string; note?: string | null; createdAt: string; user: { id: string; displayName?: string | null; zaloOpenId?: string | null }; ledger?: { id: string; type: string; amount: number; adminUserId?: string | null; note?: string | null; createdAt: string } | null; revokedByAdmin?: { id: string; username: string } | null };
export type AdminRiskEvent = { id: string; type: string; status: string; score: number; sourceType?: string | null; sourceId?: string | null; detail?: string | null; createdAt: string; reviewedAt?: string | null; user: { id: string; displayName?: string | null; zaloOpenId?: string | null }; reviewedByAdmin?: { id: string; username: string } | null };
export type AdminApiKey = { id: string; label: string; priority: number; status: string; failureCount: number; lastUsedAt?: string; pausedUntil?: string; createdAt: string };
export type AdminStorage = { provider: string; enabled: boolean; fallbackLocal: boolean; qiniuPrivate: boolean; qiniuUrlTtlSeconds: number; qiniuBucket?: string; qiniuRegion?: string; qiniuDomain?: string; qiniuAccessKey: boolean; qiniuSecretKey: boolean };
export type AdminVolcengineConfig = { configured: boolean; region: string };
export type AdminVolcengineUsage = { startDate: string; endDate: string; details: Array<{ Time: number; ObjectName: string; Usage: number; Unit: string; BillingType: string }>; totals: Record<string, number> };

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
export const setUserAdminStatus = (userId: string, isAdmin: boolean) => request<AdminUser>(`/admin/users/${userId}/admin`, { method: 'PATCH', body: JSON.stringify({ isAdmin }) });
export const getCoinAccount = (userId: string) => request<AdminCoinAccount>(`/admin/users/${userId}/coins`);
export const adjustCoin = (userId: string, body: { amount: number; note: string; idempotencyKey: string }) => request('/admin/users/' + userId + '/coins/adjust', { method: 'POST', body: JSON.stringify(body) });
export const getRewards = (userId?: string, status?: string) => request<AdminReward[]>(`/admin/rewards?${new URLSearchParams({ ...(userId ? { userId } : {}), ...(status ? { status } : {}) }).toString()}`);
export const revokeReward = (rewardId: string, reason: string) => request(`/admin/rewards/${rewardId}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) });
export const getRiskEvents = (status?: string) => request<AdminRiskEvent[]>(`/admin/risk-events?${new URLSearchParams(status ? { status } : {}).toString()}`);
export const reviewRiskEvent = (id: string, status: 'REVIEWED' | 'CLEARED') => request<AdminRiskEvent>(`/admin/risk-events/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const getApiKeys = () => request<AdminApiKey[]>('/admin/api-keys');
export const uploadTemplateCover = (dataUrl: string) => request<{ id: string; publicUrl: string }>('/admin/template-covers', { method: 'POST', body: JSON.stringify({ dataUrl }) });
export const createTemplate = (body: { slug: string; nameVi: string; nameZh: string; prompt: string; coinCost: number; coverUrl?: string }) => request<AdminTemplate>('/admin/templates', { method: 'POST', body: JSON.stringify(body) });
export const updateTemplate = (id: string, body: { nameVi: string; nameZh: string; prompt: string; coinCost: number; coverUrl?: string }) => request<AdminTemplate>(`/admin/templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const reorderTemplates = (templateIds: string[]) => request<AdminTemplate[]>('/admin/templates/order', { method: 'PATCH', body: JSON.stringify({ templateIds }) });
export const toggleTemplate = (id: string, enabled: boolean) => request<AdminTemplate>(`/admin/templates/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
export const createApiKey = (body: { label: string; value: string; priority: number }) => request<AdminApiKey>('/admin/api-keys', { method: 'POST', body: JSON.stringify(body) });
export const updateApiKey = (id: string, status: 'ACTIVE' | 'PAUSED') => request<AdminApiKey>(`/admin/api-keys/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const getVolcengineConfig = () => request<AdminVolcengineConfig>('/admin/volcengine/config');
export const updateVolcengineConfig = (body: { accessKey?: string; secretKey?: string; region: string }) => request<AdminVolcengineConfig>('/admin/volcengine/config', { method: 'PATCH', body: JSON.stringify(body) });
export const testVolcengine = () => request<{ ok: boolean; message: string }>('/admin/volcengine/test', { method: 'POST' });
export const getVolcengineUsage = (startDate: string, endDate: string) => request<AdminVolcengineUsage>(`/admin/volcengine/usage?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
export const getStorage = () => request<AdminStorage>('/admin/storage');
export const updateStorage = (body: Record<string, unknown>) => request<AdminStorage>('/admin/storage', { method: 'PATCH', body: JSON.stringify(body) });
export const testStorage = (body: Record<string, unknown>) => request<{ ok: boolean; message: string }>('/admin/storage/test', { method: 'POST', body: JSON.stringify(body) });
