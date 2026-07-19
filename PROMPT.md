# PROMPT CLAUDE CODE — CRM Correduría de Seguros (Fase 1)

## Contexto

Construye una aplicación web completa para una asesora de seguros individual (monopuesto en esta fase, pero con el esquema preparado para multi-tenant futuro). Sustituye su flujo actual de Excel + WhatsApp + notas. El objetivo de la Fase 1 es: gestión de clientes, gestión de pólizas, detección automática de renovaciones con semáforo, agenda diaria de tareas, timeline de interacciones (registro manual), calendario y buscador universal.

NO incluyas en esta fase: comparador de pólizas con IA, portal del cliente, gestión de siniestros, integración con WhatsApp/email, estadísticas avanzadas. Deja el esquema preparado pero no construyas UI para ello.

## Stack obligatorio

- Next.js 15 (App Router, TypeScript estricto)
- Supabase (Postgres + Auth + Storage + RLS)
- Tailwind CSS + shadcn/ui
- Deploy en Vercel
- date-fns para fechas (locale es-ES)
- Zod para validación de formularios (react-hook-form + zodResolver)

Idioma de toda la UI: **español**. Formato de fechas: DD/MM/YYYY. Moneda: EUR con formato español (1.234,56 €).

## Modelo de datos (Supabase)

Crea las migraciones SQL en `supabase/migrations/`. Todas las tablas llevan `id uuid primary key default gen_random_uuid()`, `created_at`, `updated_at` (con trigger de actualización) y `user_id uuid references auth.users` para RLS. Aunque ahora solo hay una usuaria, el `user_id` en todas las tablas es obligatorio: es la base del multi-tenant futuro.

### `clientes`
- nombre, apellidos (text, not null)
- dni_nie (text, unique por user_id, con validación de formato español en el cliente: DNI 8 dígitos + letra, NIE X/Y/Z + 7 dígitos + letra, con verificación de la letra de control)
- fecha_nacimiento (date)
- profesion, estado_civil (text)
- telefono, telefono_2, email (text)
- direccion, codigo_postal, poblacion, provincia (text)
- notas (text)
- estado (enum: 'activo', 'inactivo', 'potencial') default 'activo'
- origen (text, opcional: cómo llegó el cliente)

### `polizas`
- cliente_id (fk clientes, on delete restrict)
- compania (text, not null)
- numero_poliza (text, not null)
- tipo (enum: 'auto', 'hogar', 'salud', 'vida', 'comercio', 'rc', 'comunidad', 'decesos', 'accidentes', 'otro')
- matricula (text, nullable — solo para tipo auto, indexada para el buscador)
- riesgo_asegurado (text — dirección, vehículo, persona…)
- fecha_efecto (date, not null)
- fecha_vencimiento (date, not null)
- prima_anual (numeric(10,2))
- forma_pago (enum: 'anual', 'semestral', 'trimestral', 'mensual')
- coberturas (jsonb — array de objetos {nombre, capital, franquicia})
- carencias (text)
- observaciones (text)
- estado (enum: 'vigente', 'anulada', 'vencida', 'en_renovacion') default 'vigente'

### `interacciones` (timeline del cliente)
- cliente_id (fk clientes, on delete cascade)
- poliza_id (fk polizas, nullable)
- tipo (enum: 'llamada', 'whatsapp', 'email', 'reunion', 'presupuesto', 'renovacion', 'nota', 'documento', 'cambio')
- resumen (text, not null — una línea)
- detalle (text — todo lo hablado, para dar contexto en futuras llamadas)
- fecha (timestamptz, default now())

### `tareas`
- cliente_id (fk clientes, nullable — puede haber tareas sin cliente)
- poliza_id (fk polizas, nullable)
- tipo (enum: 'llamar', 'enviar_comparativa', 'recordar_pago', 'solicitar_documentacion', 'revisar_renovacion', 'reunion', 'cumpleanos', 'otro')
- titulo (text, not null)
- descripcion (text)
- fecha_vencimiento (date, not null)
- hora (time, nullable)
- estado (enum: 'pendiente', 'completada', 'pospuesta') default 'pendiente'
- generada_automaticamente (boolean default false)
- completada_at (timestamptz)

### `documentos`
- cliente_id (fk clientes, on delete cascade)
- poliza_id (fk polizas, nullable)
- categoria (enum: 'poliza', 'anulacion', 'personal', 'siniestro', 'presupuesto', 'comision', 'contratacion', 'informe', 'otro')
- nombre (text)
- storage_path (text — ruta en el bucket de Supabase Storage)
- mime_type (text), tamano_bytes (bigint)

### Índices y búsqueda
- Índices en: polizas(fecha_vencimiento), polizas(matricula), clientes(dni_nie), clientes(telefono), tareas(fecha_vencimiento, estado)
- Columna generada `busqueda tsvector` en clientes (nombre + apellidos + dni_nie + telefono + email + direccion) con índice GIN, usando la configuración 'spanish'. Igual en polizas (numero_poliza + matricula + compania + riesgo_asegurado).

### RLS
- Activa RLS en TODAS las tablas. Política única por tabla: `user_id = auth.uid()` para SELECT/INSERT/UPDATE/DELETE.
- Bucket de Storage `documentos` privado, con política que solo permite acceso a rutas que empiecen por el uid del usuario: `{user_id}/{cliente_id}/{archivo}`.
- Los documentos se sirven SIEMPRE mediante signed URLs de corta duración (60s), nunca URLs públicas.

## Lógica de renovaciones (crítico — es la función estrella)

1. Crea una función Postgres `generar_tareas_renovacion()` que:
   - Busca pólizas vigentes con `fecha_vencimiento` a ≤60 días vista que NO tengan ya una tarea de tipo 'revisar_renovacion' pendiente asociada.
   - Crea la tarea automáticamente con `generada_automaticamente = true`, fecha_vencimiento = fecha de vencimiento de la póliza − 30 días, y título "Renovación: {compania} {tipo} — {cliente}".
2. Prográmala con `pg_cron` para ejecutarse cada día a las 6:00 (si pg_cron no está disponible en el plan de Supabase, crea en su lugar un Vercel Cron Job en `/api/cron/renovaciones` protegido con `CRON_SECRET`, y documenta la configuración en `vercel.json`).
3. Semáforo en toda la UI (badge de color junto a cada póliza):
   - **Verde**: >60 días para el vencimiento
   - **Amarillo**: ≤60 días
   - **Rojo**: ≤30 días
   - **Gris/vencida**: fecha pasada (y cambia estado a 'vencida' en el mismo job diario)
4. Función Postgres adicional `generar_tareas_cumpleanos()` en el mismo job: crea tarea tipo 'cumpleanos' el día del cumpleaños de cada cliente activo.

## Páginas y UX

### `/` — Dashboard
- Tarjetas superiores: clientes activos, renovaciones del día, renovaciones del mes (con desglose amarillo/rojo), tareas pendientes hoy.
- Lista "Mi día": tareas de hoy ordenadas por hora, con acción rápida de completar (checkbox) y posponer (+1 día, +1 semana). Al pinchar en una tarea de llamada, muestra un panel lateral con las últimas 5 interacciones del cliente para tener contexto ANTES de llamar.
- Sección "Renovaciones próximas": tabla de pólizas en amarillo/rojo ordenadas por vencimiento, con acceso directo a la ficha.

### `/clientes` y `/clientes/[id]`
- Listado con búsqueda instantánea, filtros por estado, orden por apellidos.
- Ficha con pestañas: **Datos** (formulario completo editable), **Pólizas** (tabla con semáforo + contador "X pólizas vigentes" bien visible), **Timeline** (interacciones en orden cronológico inverso, con formulario rápido arriba: tipo + resumen + detalle, guardable en 2 clics), **Documentos** (subida drag&drop por categoría, listado con descarga vía signed URL), **Tareas** (pendientes y completadas del cliente).
- Botón flotante "+ Interacción" siempre visible en la ficha.

### `/polizas` y `/polizas/[id]`
- Listado global con filtros por tipo, compañía, estado y semáforo.
- Formulario de póliza con editor de coberturas dinámico (añadir/quitar filas nombre-capital-franquicia).
- Vista de detalle con todas las coberturas en tabla legible.

### `/agenda` — Calendario
- Vista mensual y semanal (usa una librería ligera tipo react-big-calendar o construye una vista propia con CSS grid; NO metas FullCalendar premium).
- Muestra: tareas, renovaciones (por fecha de vencimiento de póliza), cumpleaños. Colores distintos por tipo.
- Click en cualquier evento abre panel lateral con la información detallada completa y enlace a la ficha del cliente.

### `/buscar` + buscador global
- Input de búsqueda en la barra superior, siempre visible, con atajo Cmd/Ctrl+K.
- Busca simultáneamente en clientes y pólizas (nombre, DNI, teléfono, email, dirección, nº póliza, matrícula, compañía) usando el tsvector + ILIKE de respaldo para coincidencias parciales de matrículas y números.
- Resultados agrupados por tipo, navegables con teclado, Enter abre la ficha.

## Autenticación

- Supabase Auth con email + contraseña. Una sola usuaria en esta fase; desactiva el registro público (signup deshabilitado; crea la usuaria por seed o desde el dashboard de Supabase).
- Middleware de Next.js que protege todas las rutas excepto `/login`.

## Datos de prueba

Crea un script `supabase/seed.sql` con 15 clientes ficticios españoles realistas y ~30 pólizas variadas, incluyendo: al menos 4 pólizas que venzan en <30 días, 5 entre 30-60 días, varias interacciones por cliente y tareas de ejemplo. Esto es imprescindible para la demo.

## Calidad y entrega

- Diseño limpio y profesional, densidad de información media-alta (es una herramienta de trabajo diario, no una landing). Sidebar de navegación fija. Responsive: usable en móvil (la asesora trabaja mucho desde el teléfono), con la lista "Mi día" como pantalla principal en móvil.
- Manejo de errores en todos los formularios con mensajes en español.
- Loading states y optimistic updates en completar tareas y añadir interacciones.
- README.md con: instrucciones de setup local, variables de entorno necesarias, cómo ejecutar migraciones, cómo desplegar en Vercel y cómo configurar el cron.
- Commits atómicos con mensajes descriptivos en cada bloque funcional completado.

## Orden de trabajo sugerido

1. Setup del proyecto + Supabase + migraciones + RLS + seed
2. Auth + layout + navegación
3. CRUD clientes + ficha con pestañas
4. CRUD pólizas + semáforo
5. Timeline de interacciones
6. Tareas + generación automática de renovaciones y cumpleaños + cron
7. Dashboard "Mi día"
8. Calendario
9. Buscador global Cmd+K
10. Documentos (Storage + signed URLs)
11. Pulido responsive + README

Al terminar cada bloque, verifica con `npm run build` que no hay errores de TypeScript antes de continuar.
