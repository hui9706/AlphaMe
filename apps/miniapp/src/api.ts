import { getAuthCode } from 'zmp-sdk';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/v1';
const TOKEN_KEY = 'alphame_access_token';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers } });
  if (!response.ok) throw new Error(`AlphaMe API ${response.status}`);
  return response.json() as Promise<T>;
}

export type Session = { accessToken: string; user: { id: string; displayName?: string; avatarUrl?: string; coinAccount?: { available: number; frozen: number } } };
export type Template = { id: string; slug: string; nameVi: string; nameZh: string; prompt: string; coverUrl?: string; coinCost: number };
export type Generation = { id: string; status: 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'; sourceAssetUrl: string; resultAssetUrl?: string; coinCost: number; createdAt: string };

export async function loginWithZalo(): Promise<Session> {
  const { authCode, authCodeVerify } = await getAuthCode();
  const session = await request<Session>('/auth/zalo', { method: 'POST', body: JSON.stringify({ authCode, authCodeVerify }) });
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  return session;
}

export function isRealAuthEnabled() {
  return import.meta.env.VITE_ENABLE_REAL_AUTH === 'true';
}

export function getTemplates() { return request<Template[]>('/templates'); }
export function getCoinBalance() { return request<{ available: number; frozen: number }>('/coins/balance'); }
export function getGenerations() { return request<Generation[]>('/generations'); }
export function uploadImage(dataUrl: string) { return request<{ id: string; publicUrl: string }>('/uploads/image', { method: 'POST', body: JSON.stringify({ dataUrl }) }); }
export function createGeneration(templateId: string, sourceAssetUrl: string) { return request<Generation>('/generations', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ templateId, sourceAssetUrl }) }); }
