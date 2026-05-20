# Credenciales de prueba

> ⚠️ **NO USAR EN PRODUCCIÓN**. Cuentas creadas en Sandbox para QA.

## Admin principal (auto-asignado por trigger)
- **Email**: `davidcorreosl@gmail.com`
- **Rol**: `admin`
- Asignación automática vía `handle_new_user()` al registrarse.

## Cuentas de testing
Ver `mem://admin/credenciales-acceso` para las credenciales actuales de Admin y Staff (`control_entradas`).

## MercadoPago Sandbox
- **Token actual**: secret `MP_ACCESS_TOKEN` (Sandbox).
- Tarjetas de prueba: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/integration-test/test-cards
  - **Aprobada**: 5031 7557 3453 0604 — CVV 123 — Venc 11/30 — Nombre `APRO`
  - **Rechazada**: usar nombre `OTHE`.

## Cómo crear más cuentas Admin

Opción A — manual desde panel:
1. Login como admin.
2. Ir a `/admin/usuarios`.
3. Buscar usuario y cambiar rol a `admin`.

Opción B — SQL directo (migración):
```sql
insert into public.user_roles (user_id, role)
values ('<uuid-del-usuario>', 'admin');
```
