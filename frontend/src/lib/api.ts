import { authStore } from './auth';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = authStore.getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (res.status === 401) {
    authStore.clear();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    login:          (body: any) => request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register:       (body: any) => request<any>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    forgotPassword: (email: string) => request<any>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword:  (body: any) => request<any>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
    me:             () => request<any>('/api/auth/me'),
  },
  leads: {
    list:   (params?: string) => request<any[]>(`/api/leads${params ? '?' + params : ''}`),
    stats:  () => request<any>('/api/leads/stats'),
    create: (body: any) => request<any>('/api/leads', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) => request<any>(`/api/leads/${id}`, { method: 'DELETE' }),
  },
  properties: {
    list:   (type?: string) => request<any[]>(`/api/properties${type && type !== 'all' ? '?type=' + type : ''}`),
    stats:  () => request<any>('/api/properties/stats'),
    create: (body: any) => request<any>('/api/properties', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/api/properties/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) => request<any>(`/api/properties/${id}`, { method: 'DELETE' }),
  },
  conversations: {
    list:        () => request<any[]>('/api/conversations'),
    get:         (id: string) => request<any>(`/api/conversations/${id}`),
    sendMessage: (id: string, text: string) => request<any>(`/api/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  },
  pipeline: {
    get:    () => request<any>('/api/pipeline'),
    create: (body: any) => request<any>('/api/pipeline', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/api/pipeline/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) => request<any>(`/api/pipeline/${id}`, { method: 'DELETE' }),
  },
  reports:  { get: () => request<any>('/api/reports') },
  followups: {
    list:   () => request<any>('/api/followups'),
    create: (body: any) => request<any>('/api/followups', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/api/followups/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id: string) => request<any>(`/api/followups/${id}`, { method: 'DELETE' }),
  },
  airesponses: {
    list:   () => request<any[]>('/api/airesponses'),
    create: (body: any) => request<any>('/api/airesponses', { method: 'POST', body: JSON.stringify(body) }),
    remove: (id: string) => request<any>(`/api/airesponses/${id}`, { method: 'DELETE' }),
  },
};
