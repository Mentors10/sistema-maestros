-- ================================================================
-- SQL Script: Sistema de Login de Usuarios (Sin Encriptación)
-- Ejecutar este script en el editor SQL de Supabase (SQL Editor)
-- ================================================================

-- 1. Tabla de usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL, -- CI del usuario
  password_hash TEXT NOT NULL,          -- Almacena contraseña en texto plano
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('tecnico', 'supervisor')),
  nombre_completo VARCHAR(150) NOT NULL,
  activo BOOLEAN DEFAULT true,
  requiere_cambio_clave BOOLEAN DEFAULT true, -- Permite obligar al cambio de clave al primer acceso
  ultimo_acceso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que la columna 'requiere_cambio_clave' existe si la tabla ya había sido creada antes
ALTER TABLE usuarios_sistema ADD COLUMN IF NOT EXISTS requiere_cambio_clave BOOLEAN DEFAULT true;

-- 2. Tabla de registro de accesos (auditoría)
CREATE TABLE IF NOT EXISTS registro_accesos (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios_sistema(id) ON DELETE SET NULL,
  username VARCHAR(50) NOT NULL,
  rol VARCHAR(20) NOT NULL,
  accion VARCHAR(20) NOT NULL CHECK (accion IN ('login', 'logout')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_registro_accesos_usuario ON registro_accesos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registro_accesos_fecha ON registro_accesos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_username ON usuarios_sistema(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_rol ON usuarios_sistema(rol);

-- 4. Función RPC para validar login (Comparación directa en texto plano)
CREATE OR REPLACE FUNCTION login_usuario(p_username TEXT, p_password TEXT)
RETURNS TABLE(
  id UUID,
  username VARCHAR(50),
  rol VARCHAR(20),
  nombre_completo VARCHAR(150),
  requiere_cambio_clave BOOLEAN
) AS $$
BEGIN
  -- Actualizar último acceso si el login es exitoso
  UPDATE usuarios_sistema u
  SET ultimo_acceso = NOW(), updated_at = NOW()
  WHERE u.username = p_username
    AND u.password_hash = p_password
    AND u.activo = true;

  RETURN QUERY
  SELECT u.id, u.username, u.rol, u.nombre_completo, u.requiere_cambio_clave
  FROM usuarios_sistema u
  WHERE u.username = p_username
    AND u.password_hash = p_password
    AND u.activo = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función RPC para cambiar contraseña en texto plano
CREATE OR REPLACE FUNCTION cambiar_password(
  p_usuario_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE usuarios_sistema
  SET password_hash = p_new_password,
      requiere_cambio_clave = false,
      updated_at = NOW()
  WHERE id = p_usuario_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función para registrar accesos (auditoría)
CREATE OR REPLACE FUNCTION registrar_acceso(
  p_usuario_id UUID,
  p_username TEXT,
  p_rol TEXT,
  p_accion TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO registro_accesos (usuario_id, username, rol, accion, user_agent)
  VALUES (p_usuario_id, p_username, p_rol, p_accion, p_user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Registrar los usuarios reales (con clave inicial en texto plano: 123456)
INSERT INTO usuarios_sistema (username, password_hash, rol, nombre_completo, requiere_cambio_clave) VALUES
  ('7782629', '123456', 'tecnico', 'Juan Pablo Alba vaca', true),
  ('3355859', '123456', 'tecnico', 'CLAUDIA LISETT OLIVARES RIVERO', true),
  ('8888888', '123456', 'supervisor', 'Hugo Eduardo Rodriguez Mondaque', true)
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash,
    nombre_completo = EXCLUDED.nombre_completo,
    rol = EXCLUDED.rol,
    requiere_cambio_clave = true;

-- 8. Habilitar RLS (Row Level Security)
ALTER TABLE usuarios_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_accesos ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores para evitar el error de políticas existentes
DROP POLICY IF EXISTS "Permitir lectura de usuarios" ON usuarios_sistema;
DROP POLICY IF EXISTS "Permitir inserción de accesos" ON registro_accesos;
DROP POLICY IF EXISTS "Permitir lectura de accesos" ON registro_accesos;
DROP POLICY IF EXISTS "Permitir modificación de usuarios" ON usuarios_sistema;

-- Políticas
CREATE POLICY "Permitir lectura de usuarios" ON usuarios_sistema FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de accesos" ON registro_accesos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura de accesos" ON registro_accesos FOR SELECT USING (true);
CREATE POLICY "Permitir modificación de usuarios" ON usuarios_sistema FOR UPDATE USING (true);
