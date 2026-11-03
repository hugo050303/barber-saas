-- =====================================================================
-- Permisos de acceso para el Data API de Neon
--
-- IMPORTANTE: correr DESPUÉS de activar "Data API" y "Neon Auth" en la
-- consola de Neon (al activarlos se crean los roles "authenticated" y
-- "anonymous" que se usan aquí). Es seguro correrlo más de una vez.
--
--  * authenticated = usuarios que iniciaron sesión (el personal de la
--    barbería): acceso completo a todo.
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

-- 2) Personal con sesión iniciada: acceso completo
GRANT USAGE ON SCHEMA public TO authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['configuracion','barberos','servicios','clientes','citas',
                           'inventario','ventas_productos','gastos','cortes_caja']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS personal_todo ON %I', t);
    EXECUTE format('CREATE POLICY personal_todo ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- 3) Página pública de reservas (sin sesión)
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
