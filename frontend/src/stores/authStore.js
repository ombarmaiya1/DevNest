import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';
import { authApi } from '../services/api.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,

  /**
   * Initializes authentication state:
   * 1. Restores existing session from local storage on reload.
   * 2. Calls backend GET /api/v1/auth/me using the access token.
   * 3. Sets up persistent listener for auth state changes (sign-in, token refresh, sign-out).
   */
  initialize: async () => {
    try {
      set({ loading: true, error: null });

      // 1. Restore session on reload
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (session) {
        set({ session, user: session.user });
        // Call backend /api/v1/auth/me to sync profile
        try {
          const profileResponse = await authApi.getMe(session.access_token);
          if (profileResponse?.success) {
            set({ profile: profileResponse.data });
          }
        } catch (apiErr) {
          console.warn('Backend profile fetch warning:', apiErr?.response?.data?.message || apiErr.message);
        }
      } else {
        set({ session: null, user: null, profile: null });
      }

      // 2. Listen for auth state transitions
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (newSession) {
          set({ session: newSession, user: newSession.user });
          try {
            const profileResponse = await authApi.getMe(newSession.access_token);
            if (profileResponse?.success) {
              set({ profile: profileResponse.data });
            }
          } catch (apiErr) {
            console.warn('Backend profile fetch warning:', apiErr?.response?.data?.message || apiErr.message);
          }
        } else {
          set({ session: null, user: null, profile: null });
        }
        set({ loading: false });
      });
    } catch (err) {
      console.error('Auth initialization error:', err);
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.session) {
        set({ session: data.session, user: data.user });
        // Sync profile from backend
        try {
          const profileResponse = await authApi.getMe(data.session.access_token);
          if (profileResponse?.success) {
            set({ profile: profileResponse.data });
          }
        } catch (apiErr) {
          console.warn('Backend profile sync warning:', apiErr?.response?.data?.message || apiErr.message);
        }
      }

      return data;
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, session: null, profile: null });
    } catch (err) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

