const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const API_BASE_URL = (raw?.trim() ? raw.trim() : '/api').replace(/\/$/, '');

// ── BACKEND URL ────────────────────────────────────────────────────────────
// Use VITE_BACKEND_URL if provided, else fallback to Render or Localhost
export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL?.trim() || 
  'https://projetpfe-6zg2.onrender.com'
).replace(/\/$/, '');
