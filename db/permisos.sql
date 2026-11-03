-- =====================================================================
-- Permisos de acceso para el Data API de Neon
--
-- IMPORTANTE: correr DESPUÉS de activar "Data API" y "Neon Auth" en la
-- consola de Neon (al activarlos se crean los roles "authenticated" y
-- "anonymous" que se usan aquí). Es seguro correrlo más de una vez.
--
--  * authenticated = usuarios con sesión. Solo los que estén en la tabla
--    "personal" tienen acceso completo; los demás no ven nada.
--  * anonymous = visitantes de la página pública de reservas: solo pueden
--    ver barberos y servicios, y crear una cita / registrarse como cliente.
--    No pueden ver ni modificar citas, clientes, ventas, gastos, etc.
-- =====================================================================

-- 1) Activar Row Level Security en todas las tablas
ALTER TABLE configuracion     ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_productos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortes_caja       ENABLE ROW LEVEL SECURITY;

-- 2) Lista del personal autorizado
-- Neon Auth deja que CUALQUIERA se registre, así que tener cuenta no basta:
-- solo los usuarios cuyo id esté en esta tabla pueden usar el sistema.
-- Para autorizar a alguien (después de crear su usuario en Neon Auth):
--   INSERT INTO personal (user_id, email)
--   SELECT id::text, email FROM neon_auth."user" WHERE email = 'correo@ejemplo.com';
CREATE TABLE IF NOT EXISTS personal (
  user_id     text PRIMARY KEY,
  email       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE personal ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON personal FROM authenticated, anonymous;

-- auth.user_id() la da Neon con el token de la sesión. SECURITY DEFINER
-- permite consultar "personal" sin dar acceso directo a esa tabla.
CREATE OR REPLACE FUNCTION es_personal() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM personal WHERE user_id = auth.user_id());
$$;
REVOKE ALL ON FUNCTION es_personal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION es_personal() TO authenticated;

-- 3) Personal autorizado: acceso completo a las tablas de la barbería
GRANT USAGE ON SCHEMA public TO authenticated, anonymous;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['configuracion','barberos','servicios','clientes','citas',
                           'inventario','ventas_productos','gastos','cortes_caja']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS personal_todo ON %I', t);
    EXECUTE format('CREATE POLICY personal_todo ON %I FOR ALL TO authenticated USING (es_personal()) WITH CHECK (es_personal())', t);
  END LOOP;
END $$;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4) Página pública de reservas (sin sesión)
GRANT SELECT ON barberos, servicios TO anonymous;
GRANT INSERT ON citas, clientes TO anonymous;
GRANT USAGE ON SEQUENCE citas_id_seq, clientes_id_seq TO anonymous;

DROP POLICY IF EXISTS publico_ver ON barberos;
CREATE POLICY publico_ver ON barberos FOR SELECT TO anonymous USING (true);

DROP POLICY IF EXISTS publico_ver ON servicios;
CREATE POLICY publico_ver ON servicios FOR SELECT TO anonymous USING (true);

-- Solo puede crear citas nuevas en estado "pendiente"
DROP POLICY IF EXISTS publico_reservar ON citas;
CREATE POLICY publico_reservar ON citas FOR INSERT TO anonymous
  WITH CHECK (estado = 'pendiente');

DROP POLICY IF EXISTS publico_registrarse ON clientes;
CREATE POLICY publico_registrarse ON clientes FOR INSERT TO anonymous
  WITH CHECK (true);
