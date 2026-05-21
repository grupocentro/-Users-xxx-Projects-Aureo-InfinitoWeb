-- =============================================================================
-- cleanup-demo-data.sql
-- =============================================================================
-- Limpia toda la demo data generada por la Fase masiva de "demo-ready":
--   - 100 compras de prueba (mp_payment_id LIKE 'demo_%')
--   - compra demo presentación (mp_payment_id LIKE 'demo_presentacion_%')
--   - QRs asociados (codigos_qr.compra_id IN demo)
--   - validaciones asociadas (qr_validaciones.compra_id IN demo + scanner_source='demo_seed')
--   - filas de calendario con etiqueta de demo (nota LIKE 'Demo:%')
--
-- NO toca:
--   - usuarios reales (auth.users / profiles / user_roles)
--   - davidcorreosl@gmail.com / qr1 / qr2 / qr3
--   - compras reales (sin prefijo demo_ en mp_payment_id)
--   - tipos_entrada, eventos, hero_slides, atracciones, actividades
--
-- Uso:
--   1. Conectarse al proyecto correcto (ywoynzvitzyjgeyohsfc).
--   2. Ejecutar bloque por bloque o todo de una.
--   3. Verificar conteos al final.
-- =============================================================================

-- Para reversión segura, todo dentro de una transacción explícita.
BEGIN;

-- ─── 1. Validaciones demo ───────────────────────────────────────────────────
-- Se borran las validaciones cuyo compra_id apunta a compras demo
-- + las "no_encontrado" del seed (que no tienen compra_id) marcadas por metadata.
DELETE FROM public.qr_validaciones
WHERE compra_id IN (
  SELECT id FROM public.compras WHERE mp_payment_id LIKE 'demo_%'
)
OR metadata->>'scanner_source' = 'demo_seed';

-- ─── 2. Códigos QR demo ─────────────────────────────────────────────────────
DELETE FROM public.codigos_qr
WHERE compra_id IN (
  SELECT id FROM public.compras WHERE mp_payment_id LIKE 'demo_%'
);

-- ─── 3. Compras demo (incluye la de presentación) ──────────────────────────
DELETE FROM public.compras
WHERE mp_payment_id LIKE 'demo_%';

-- ─── 4. Filas de calendario marcadas como demo ──────────────────────────────
-- Solo borra filas cuya nota empieza con "Demo:". Días que el usuario
-- haya cargado manualmente con otra nota se preservan.
DELETE FROM public.calendario
WHERE nota LIKE 'Demo:%';

-- ─── 5. Verificación final ──────────────────────────────────────────────────
-- Estos counts deberían ser todos coherentes con compras/QR/validaciones REALES,
-- sin contar la demo data.
SELECT
  'compras_total'         AS metric, COUNT(*) AS n FROM public.compras
UNION ALL SELECT 'compras_demo_restantes', COUNT(*) FROM public.compras WHERE mp_payment_id LIKE 'demo_%'
UNION ALL SELECT 'qr_total',               COUNT(*) FROM public.codigos_qr
UNION ALL SELECT 'qr_huerfanos',           COUNT(*) FROM public.codigos_qr WHERE compra_id NOT IN (SELECT id FROM public.compras)
UNION ALL SELECT 'validaciones_total',     COUNT(*) FROM public.qr_validaciones
UNION ALL SELECT 'calendario_total',       COUNT(*) FROM public.calendario
UNION ALL SELECT 'calendario_demo_restantes', COUNT(*) FROM public.calendario WHERE nota LIKE 'Demo:%'
ORDER BY metric;

-- Si todo coherente, confirmar:
COMMIT;
-- Si algo se ve raro, en su lugar:
-- ROLLBACK;
