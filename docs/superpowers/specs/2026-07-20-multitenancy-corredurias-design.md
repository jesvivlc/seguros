# Diseño — Multi-tenancy (corredurías)

Fecha: 2026-07-20
Estado: aprobado (el usuario delegó las decisiones: "decide tú")

## Objetivo

Convertir el CRM (hoy monopuesto, aislado por `user_id`) en una app **multi-tenant**
que se pueda vender a varias corredurías, cada una con varios usuarios y su cartera
aislada del resto. El proveedor (super-admin) da de alta las corredurías; cada
correduría gestiona sus propios agentes.

## Decisiones de producto

1. **Provisión provider-first**: el super-admin (proveedor) crea las corredurías y su
   primer admin. El registro público sigue **desactivado**.
2. **Un usuario pertenece a una sola correduría**. Los super-admin no pertenecen a
   ninguna.
3. **Roles**: `super_admin` (plataforma), `admin` (correduría), `agente`.
4. **Visibilidad configurable por correduría** (la decide su admin):
   - `compartida`: todos los usuarios de la correduría ven/editan toda la cartera.
   - `por_agente`: cada agente ve solo los registros de los que es propietario; el
     admin ve todo.
5. **Privacidad del super-admin**: gestiona corredurías y sus admins, pero **no** tiene
   acceso en la app a los datos de clientes de ninguna correduría.
6. **Alta de usuarios = creación directa** (email + contraseña temporal) desde la app.
   No hay invitación por email (la integración de email es de Fase 2).
7. **Aislamiento técnico**: esquema compartido + columna `correduria_id` + RLS (opción A).

### Fuera de alcance (YAGNI por ahora)
Facturación/suscripciones · invitaciones por email · reasignar cartera entre agentes
(el propietario es el creador) · aislamiento físico por esquema/BD.

## Modelo de datos

### Tablas nuevas

`corredurias`
- `id uuid pk`, `nombre text not null`, `cif text`, 
- `visibilidad` enum `('compartida','por_agente')` default `'compartida'`,
- `activa boolean default true`, `created_at`, `updated_at`.

`perfiles` (1 fila por usuario de `auth.users`)
- `user_id uuid pk → auth.users(id) on delete cascade`
- `correduria_id uuid → corredurias(id)` (nullable: super-admin no tiene)
- `rol` enum `('admin','agente')` (nullable para super-admin puro)
- `nombre_completo text`
- `es_super_admin boolean default false`
- `activo boolean default true`, `created_at`, `updated_at`.

### Cambios en tablas existentes
A `clientes`, `polizas`, `interacciones`, `tareas`, `documentos`:
- añadir `correduria_id uuid not null → corredurias(id)`.
- `user_id` se mantiene y pasa a significar **agente propietario** (creador). Gobierna
  la visibilidad en modo `por_agente`.
- Índices nuevos en `correduria_id` por tabla.

## Seguridad (RLS)

### Funciones helper (SECURITY DEFINER, stable)
- `mi_correduria()` → `correduria_id` del perfil del `auth.uid()`.
- `mi_rol()` → `'admin'` | `'agente'`.
- `es_super_admin()` → boolean.
- (interna) lectura del `visibilidad` de una correduría.

### Políticas
- **Tablas de datos** (las 5): visible/editable si
  `correduria_id = mi_correduria()` **y**
  (`visibilidad = 'compartida'` **o** `user_id = auth.uid()` **o** `mi_rol() = 'admin'`).
  - `WITH CHECK` en inserciones: `correduria_id = mi_correduria()` y `user_id = auth.uid()`.
  - El super-admin **no** aparece en estas políticas → sin acceso a datos de clientes.
- **`corredurias`**: super-admin todo; admin lee/actualiza la suya (p. ej. `visibilidad`);
  agente solo lectura de la suya.
- **`perfiles`**: super-admin todo; admin gestiona (crea/edita/desactiva) perfiles de SU
  correduría; cada usuario lee su propio perfil y los de su correduría.
- **Storage** (`documentos`): ruta `{correduria_id}/{cliente_id}/{archivo}`; la política
  exige que la primera carpeta sea una correduría a la que pertenece el usuario.

## Cambios en la app

### Auth (servidor)
- `requireUser()` amplía a cargar el perfil: `{ user, perfil }` con `correduria_id`,
  `rol`, `es_super_admin`.
- Nuevos helpers: `requireCorreduria()` (exige perfil con correduría; si super-admin sin
  correduría → redirect `/admin`) y `requireSuperAdmin()`.
- Enrutado tras login:
  - super-admin (sin correduría) → `/admin`.
  - usuario de correduría → `/` (Mi día).
- Las server actions de alta fijan `correduria_id = mi_correduria()` y
  `user_id = auth.uid()`. El resto de queries ya se filtran por RLS (cambios mínimos).

### UI nueva
- **`/admin`** (super-admin): listado de corredurías; crear correduría + primer admin
  (nombre + email/contraseña); activar/desactivar. Server actions usan `service_role`
  para crear el usuario admin y su perfil, verificando que el llamante es super-admin.
- **Ajustes → Equipo** (admin de correduría): crear agentes (email + contraseña temporal),
  activar/desactivar, cambiar rol; interruptor de **visibilidad** compartida/por-agente.
  Server actions verifican que el llamante es admin de esa correduría.
- Barra lateral: muestra el nombre de la correduría actual.

### Creación de usuarios
Server action con `service_role` → `auth.admin.createUser({email, password, email_confirm:true})`
+ insert en `perfiles` con la correduría y rol correspondientes. Autorización comprobada
en la propia action según el rol del llamante.

## Migración y arranque

- **`0006_multitenant.sql`**: enums, `corredurias`, `perfiles`, `correduria_id` en las 5
  tablas (+ índices), funciones helper, RESET de las políticas RLS antiguas (por `user_id`)
  y creación de las nuevas, actualización de las políticas de Storage.
- La BD no tiene datos de clientes → sin backfill de cartera.
- **Bootstrap super-admin**: script `scripts/set-super-admin.mjs <email>` que crea/actualiza
  el perfil de ese usuario con `es_super_admin = true`. Se ejecuta una vez para
  `jesvivlc+seguro@gmail.com`.

## Pruebas

- **Aislamiento entre corredurías**: con tokens de usuarios de A y de B, cada uno solo
  obtiene sus filas (REST/SQL con sesiones distintas).
- **Modo `por_agente`**: un agente no ve registros de otro agente; el admin sí.
- **Modo `compartida`**: todos ven todo dentro de la correduría.
- **Super-admin**: puede gestionar corredurías/perfiles pero NO leer `clientes` de una
  correduría.
- **Storage**: un usuario no puede firmar URLs de documentos de otra correduría.
- Guion de verificación reproducible (estilo `scripts/verify-timezone.ts`).

## Bloque C (siguiente, fuera de este spec)
Tras multi-tenancy: seed de 2-3 corredurías ficticias con admins, agentes y datos
(clientes/pólizas/tareas) para validar el aislamiento y los dos modos de visibilidad.
