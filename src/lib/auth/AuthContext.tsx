'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';

// ============================================================
// Types
// ============================================================
export type UserRole = 'tecnico' | 'supervisor';

export interface AuthUser {
  id: string;
  username: string;
  rol: UserRole;
  nombre_completo: string;
  requiere_cambio_clave: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isSupervisor: boolean;
  isTecnico: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

// ============================================================
// Context
// ============================================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'unefco_session';

// ============================================================
// Provider
// ============================================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser;
        if (parsed && parsed.id && parsed.username && parsed.rol) {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.error('Error restoring session:', e);
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Login ──────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc('login_usuario', {
        p_username: username.trim().toLowerCase(),
        p_password: password,
      });

      if (error) {
        console.error('Login RPC error:', error);
        return { success: false, error: 'Error al conectar con el servidor.' };
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        return { success: false, error: 'Usuario o contraseña incorrectos.' };
      }

      const userData = Array.isArray(data) ? data[0] : data;
      const authUser: AuthUser = {
        id: userData.id,
        username: userData.username,
        rol: userData.rol as UserRole,
        nombre_completo: userData.nombre_completo,
        requiere_cambio_clave: !!userData.requiere_cambio_clave,
      };

      // Save to state and session
      setUser(authUser);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));

      // Log access (fire and forget)
      try {
        await supabase.rpc('registrar_acceso', {
          p_usuario_id: authUser.id,
          p_username: authUser.username,
          p_rol: authUser.rol,
          p_accion: 'login',
          p_user_agent: navigator.userAgent,
        });
      } catch (e) {
        console.error('Error logging access:', e);
      }

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Error inesperado. Intente nuevamente.' };
    }
  }, []);

  // ─── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (user) {
      // Log logout (fire and forget)
      try {
        await supabase.rpc('registrar_acceso', {
          p_usuario_id: user.id,
          p_username: user.username,
          p_rol: user.rol,
          p_accion: 'logout',
          p_user_agent: navigator.userAgent,
        });
      } catch (e) {
        console.error('Error logging logout:', e);
      }
    }
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, [user]);

  // ─── Change Password ────────────────────────────────────────
  const changePassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'No hay usuario autenticado.' };
    }
    try {
      const { data, error } = await supabase.rpc('cambiar_password', {
        p_usuario_id: user.id,
        p_new_password: newPassword,
      });

      if (error) {
        console.error('Change password RPC error:', error);
        return { success: false, error: 'Error al cambiar la contraseña en el servidor.' };
      }

      const updatedUser: AuthUser = {
        ...user,
        requiere_cambio_clave: false,
      };

      // Save to state and session
      setUser(updatedUser);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));

      return { success: true };
    } catch (err) {
      console.error('Change password error:', err);
      return { success: false, error: 'Error inesperado. Intente nuevamente.' };
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user,
    isLoading,
    isSupervisor: user?.rol === 'supervisor',
    isTecnico: user?.rol === 'tecnico',
    login,
    logout,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
