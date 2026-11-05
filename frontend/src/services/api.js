import axios from 'axios';
import { supabase } from '../lib/supabase.js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || process.env || {};

export const api = axios.create({
  baseURL: env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically attach Bearer token from the current Supabase session
api.interceptors.request.use(async (config) => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    console.error('Error attaching auth token to API request:', err);
  }
  return config;
});

// Centralized API calls
export const authApi = {
  getMe: async (token) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const response = await api.get('/auth/me', config);
    return response.data;
  },
};
