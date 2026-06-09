'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Lock, User, Eye, EyeOff, LogIn, AlertCircle, Shield } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Ingrese usuario y contraseña.');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await login(username, password);

    if (!result.success) {
      setError(result.error || 'Error de autenticación.');
      setIsLoading(false);
    }
    // If success, the parent component will detect user change and unmount this
  };

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg-shapes">
        <div className="login-shape login-shape-1" />
        <div className="login-shape login-shape-2" />
        <div className="login-shape login-shape-3" />
      </div>

      <div className="login-card">
        {/* Logo / Branding */}
        <div className="login-brand">
          <div className="login-logo-circle">
            <Shield size={36} />
          </div>
          <h1 className="login-title">Sistema UNEFCO</h1>
          <p className="login-subtitle">Control de Maestros e Itinerarios Formativos</p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {/* Username */}
          <div className="login-field">
            <label htmlFor="login-username">
              <User size={14} /> Usuario
            </label>
            <div className="login-input-wrapper">
              <input
                ref={usernameRef}
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                placeholder="Ingrese su usuario"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="login-password">
              <Lock size={14} /> Contraseña
            </label>
            <div className="login-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Ingrese su contraseña"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="login-error">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="login-spinner" />
            ) : (
              <LogIn size={16} />
            )}
            {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p>© {new Date().getFullYear()} UNEFCO — Ministerio de Educación</p>
        </div>
      </div>
    </div>
  );
}
