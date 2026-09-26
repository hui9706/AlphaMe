import { getAccessToken, nativeStorage } from 'zmp-sdk';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://pic.alphavn.tech/v1';
const TOKEN_KEY = 'alphame_access_token';

export function resolveTemplateCoverUrl(coverUrl?: string, cacheKey?: string) {
  if (!coverUrl || !/^https?:\/\//i.test(coverUrl)) return undefined;
  if (!cacheKey) return coverUrl;
  const url = new URL(coverUrl);
  // Qiniu private download URLs are already signed; adding a cache-busting
  // query parameter would invalidate the signature.
  if (url.searchParams.has('token') || url.hostname === 'oss.alphavn.tech') return coverUrl;
  url.searchParams.set('v', cacheKey);
  return url.toString();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers } });
  if (!response.ok) throw new Error(`API_${response.status}`);
  return response.json() as Promise<T>;
}

export type Session = { accessToken: string; user: { id: string; username?: string | null; displayName?: string | null; avatarUrl?: string | null; coinAccount?: { available: number; frozen: number } | null } };
export type Template = { id: string; slug: string; nameVi: string; nameZh: string; prompt: string; coverUrl?: string; coinCost: number; updatedAt?: string };
export type Generation = { id: string; status: 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'; sourceAssetUrl: string; resultAssetUrl?: string; coinCost: number; createdAt: string };
export type PlazaWork = { id: string; publishedAt: string; user: { id: string; displayName?: string | null; avatarUrl?: string | null }; generation: { id: string; resultAssetUrl?: string | null; createdAt: string }; likes: number; liked: boolean };
export type CoinLedgerEntry = { id: string; type: string; amount: number; availableAfter: number; frozenAfter: number; generationId?: string | null; note?: string | null; createdAt: string; rewardType?: string | null; rewardStatus?: string | null; rewardSourceType?: string | null; revokeReason?: string | null };
export type CheckInStatus = { date: string; checkedIn: boolean; rewardAmount: number };

export async function loginWithZalo(): Promise<Session> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('ZALO_ACCESS_TOKEN_EMPTY');
  const session = await request<Session>('/auth/zalo', { method: 'POST', body: JSON.stringify({ accessToken }) });
  setStoredAccessToken(session.accessToken);
  return session;
}

export async function loginWithCredentials(username: string, password: string, register = false): Promise<Session> {
  const session = await request<Session>(register ? '/auth/register' : '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setStoredAccessToken(session.accessToken);
  return session;
}

export function isRealAuthEnabled() {
  return import.meta.env.PROD || import.meta.env.VITE_ENABLE_REAL_AUTH === 'true';
}

export function getStoredAccessToken() {
  try { return nativeStorage.getItem(TOKEN_KEY) || null; }
  catch { return localStorage.getItem(TOKEN_KEY); }
}

export function clearAccessToken() {
  try { nativeStorage.removeItem(TOKEN_KEY); }
  catch { localStorage.removeItem(TOKEN_KEY); }
}

function setStoredAccessToken(token: string) {
  try { nativeStorage.setItem(TOKEN_KEY, token); }
  catch { localStorage.setItem(TOKEN_KEY, token); }
}

export function getMe() { return request<Session['user']>('/auth/me'); }

export function getTemplates() { return request<Template[]>('/templates'); }
export function getCoinBalance() { return request<{ available: number; frozen: number }>('/coins/balance'); }
export function getCoinLedger(limit = 50) { return request<CoinLedgerEntry[]>(`/coins/ledger?limit=${limit}`); }
export function getCheckInStatus() { return request<CheckInStatus>('/coins/check-in/status'); }
export function checkIn() { return request<CheckInStatus & { alreadyCheckedIn: boolean }>('/coins/check-in', { method: 'POST' }); }
export function getGenerations() { return request<Generation[]>('/generations'); }
export function getPlazaWorks(limit = 30) { return request<PlazaWork[]>(`/plaza/works?limit=${limit}`); }
export function publishPlazaWork(generationId: string) { return request<{ id: string }>('/plaza/works', { method: 'POST', body: JSON.stringify({ generationId }) }); }
export function likePlazaWork(id: string) { return request<{ plazaWorkId: string; liked: boolean; likes: number }>('/plaza/works/' + id + '/like', { method: 'POST' }); }
export function unlikePlazaWork(id: string) { return request<{ plazaWorkId: string; liked: boolean; likes: number }>('/plaza/works/' + id + '/like', { method: 'DELETE' }); }
export function createShare(generationId: string) { return request<{ shareToken: string; generationId: string }>('/shares', { method: 'POST', body: JSON.stringify({ generationId }) }); }
export function openShare(shareToken: string) { return request<{ opened: boolean; rewarded: boolean; alreadyOpened?: boolean }>('/shares/' + encodeURIComponent(shareToken) + '/open', { method: 'POST' }); }
export function uploadImage(dataUrl: string) { return request<{ id: string; publicUrl: string }>('/uploads/image', { method: 'POST', body: JSON.stringify({ dataUrl }) }); }
export function createGeneration(templateId: string, sourceAssetUrl: string) { return request<Generation>('/generations', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ templateId, sourceAssetUrl }) }); }
