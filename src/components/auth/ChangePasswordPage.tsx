'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Lock, Eye, EyeOff, Save, AlertCircle, LogOut } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ChangePasswordPage() {
  const { changePassword, logout, user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Por favor complete ambos campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    // Prevent using the default password as the new one
    if (newPassword === '123456') {
      setError('No puede usar la contraseña temporal por defecto. Elija una nueva.');
      return;
    }

    setIsLoading(true);

    const result = await changePassword(newPassword);

    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: '¡Contraseña cambiada!',
        text: 'Su contraseña ha sido actualizada con éxito.',
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } else {
      setError(result.error || 'Error al cambiar la contraseña.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg-shapes">
        <div className="login-shape login-shape-1" />
        <div className="login-shape login-shape-2" />
        <div className="login-shape login-shape-3" />
      </div>

      <div className="login-card" style={{ maxWidth: '460px' }}>
        {/* Logo / Branding */}
        <div className="login-brand">
          <div className="login-logo-circle" style={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
            <Lock size={36} />
          </div>
          <h1 className="login-title">Seguridad de la Cuenta</h1>
          <p className="login-subtitle">
            Hola <strong style={{ color: '#f59e0b' }}>{user?.nombre_completo}</strong>.<br />
            Para proteger su información, es obligatorio cambiar su contraseña temporal antes de ingresar al sistema.
          </p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {/* New Password */}
          <div className="login-field">
            <label htmlFor="change-new-password">
              <Lock size={14} /> Nueva Contraseña
            </label>
            <div className="login-input-wrapper">
              <input
                ref={passwordRef}
                id="change-new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                placeholder="Nueva contraseña"
                autoComplete="new-password"
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

          {/* Confirm Password */}
          <div className="login-field">
            <label htmlFor="change-confirm-password">
              <Lock size={14} /> Confirmar Nueva Contraseña
            </label>
            <div className="login-input-wrapper">
              <input
                id="change-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Repita la contraseña"
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="login-error">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={logout}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '13px 20px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8'
              }}
            >
              <LogOut size={16} /> Salir
            </button>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
              style={{ flex: 2 }}
            >
              {isLoading ? (
                <span className="login-spinner" />
              ) : (
                <Save size={16} />
              )}
              {isLoading ? 'Guardando...' : 'Cambiar y Entrar'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p>© {new Date().getFullYear()} UNEFCO — Ministerio de Educación</p>
        </div>
      </div>
    </div>
  );
}
