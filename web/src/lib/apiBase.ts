
const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const API_BASE_URL = (raw?.trim() ? raw.trim() : '/api').replace(/\/$/, '');

export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL?.trim() || '').replace(/\/$/, '');
