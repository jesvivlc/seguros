-- =============================================================================
-- seed.sql — Datos de demostración: 15 clientes, ~30 pólizas, interacciones y
-- tareas. Las fechas de vencimiento son RELATIVAS a current_date para que el
-- semáforo siempre muestre rojo/amarillo/verde en la demo.
--
-- Requisito: debe existir al menos una usuaria en auth.users (créala en el
-- dashboard de Supabase o con el script scripts/create-user.mjs). El seed usa
-- la usuaria más antigua.
--
-- Idempotente: borra los datos de demo previos de esa usuaria antes de insertar.
-- =============================================================================

do $$
declare
  v_user uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; c6 uuid; c7 uuid; c8 uuid;
  c9 uuid; c10 uuid; c11 uuid; c12 uuid; c13 uuid; c14 uuid; c15 uuid;
  p uuid;
begin
  select id into v_user from auth.users order by created_at asc limit 1;
  if v_user is null then
    raise exception 'No hay usuarios en auth.users. Crea la usuaria antes de sembrar.';
  end if;

  -- Limpieza idempotente (respeta el orden de FKs).
  delete from public.documentos    where user_id = v_user;
  delete from public.tareas        where user_id = v_user;
  delete from public.interacciones where user_id = v_user;
  delete from public.polizas       where user_id = v_user;
  delete from public.clientes      where user_id = v_user;

  -- ---------------------------------------------------------------------------
  -- CLIENTES
  -- ---------------------------------------------------------------------------
  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, telefono_2, email, direccion, codigo_postal, poblacion, provincia, estado, origen, notas)
  values (v_user, 'María', 'García López', '12345678Z', '1985-04-12', 'Profesora', 'Casada', '612345678', null, 'maria.garcia@example.com', 'Calle Mayor 12, 3ºB', '28013', 'Madrid', 'Madrid', 'activo', 'Recomendación', 'Cliente desde 2018. Muy puntual con los pagos.')
  returning id into c1;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'José', 'Martínez Ruiz', '87654321X', '1972-11-03', 'Autónomo', 'Casado', '623456789', 'jose.martinez@example.com', 'Avenida de la Constitución 45', '41001', 'Sevilla', 'Sevilla', 'activo', 'Web')
  returning id into c2;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'Carmen', 'Fernández Gómez', '11223344A', '1990-07-21', 'Enfermera', 'Soltera', '634567890', 'carmen.fernandez@example.com', 'Plaza España 8, 1ºA', '46002', 'Valencia', 'Valencia', 'activo', 'Recomendación')
  returning id into c3;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'Antonio', 'Sánchez Díaz', '55667788B', '1968-01-30', 'Ingeniero', 'Divorciado', '645678901', 'antonio.sanchez@example.com', 'Calle Gran Vía 100', '48001', 'Bilbao', 'Bizkaia', 'activo', 'Cartera heredada')
  returning id into c4;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'Laura', 'Jiménez Moreno', '99887766C', '1995-09-15', 'Diseñadora', 'Pareja de hecho', '656789012', 'laura.jimenez@example.com', 'Calle Sierpes 23', '41004', 'Sevilla', 'Sevilla', 'activo', 'Instagram')
  returning id into c5;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'Francisco', 'Ruiz Torres', '44556677D', '1980-06-08', 'Comercial', 'Casado', '667890123', 'francisco.ruiz@example.com', 'Avenida Diagonal 200, 5º', '08018', 'Barcelona', 'Barcelona', 'activo', 'Web')
  returning id into c6;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'Isabel', 'Moreno Vega', '33445566E', '1975-03-25', 'Abogada', 'Casada', '678901234', 'isabel.moreno@example.com', 'Calle Larios 15, 2ºC', '29005', 'Málaga', 'Málaga', 'activo', 'Recomendación')
  returning id into c7;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'Manuel', 'Álvarez Castro', '22334455F', '1988-12-11', 'Cocinero', 'Soltero', '689012345', 'manuel.alvarez@example.com', 'Calle Uría 30', '33003', 'Oviedo', 'Asturias', 'activo', 'Web')
  returning id into c8;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'Rosa', 'Romero Ortega', '66778899G', '1962-05-19', 'Jubilada', 'Viuda', '690123456', 'rosa.romero@example.com', 'Plaza del Pilar 3', '50003', 'Zaragoza', 'Zaragoza', 'activo', 'Cartera heredada')
  returning id into c9;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'David', 'Navarro Molina', '77889900H', '1992-08-27', 'Programador', 'Soltero', '601234567', 'david.navarro@example.com', 'Calle Colón 55, 4ºD', '46004', 'Valencia', 'Valencia', 'potencial', 'LinkedIn')
  returning id into c10;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'Pilar', 'Gutiérrez Ramos', '88990011J', '1978-10-05', 'Farmacéutica', 'Casada', '612340987', 'pilar.gutierrez@example.com', 'Avenida de la Paz 78', '26004', 'Logroño', 'La Rioja', 'activo', 'Recomendación')
  returning id into c11;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'Javier', 'Domínguez Blanco', '10111213K', '1983-02-14', 'Arquitecto', 'Casado', '623451098', 'javier.dominguez@example.com', 'Calle Toledo 44', '28005', 'Madrid', 'Madrid', 'activo', 'Web')
  returning id into c12;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'Ana', 'Serrano Prieto', '14151617L', '1998-11-30', 'Estudiante', 'Soltera', '634562109', 'ana.serrano@example.com', 'Calle Real 9, 1ºB', '15003', 'A Coruña', 'A Coruña', 'potencial', 'Instagram')
  returning id into c13;

  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen)
  values (v_user, 'Miguel', 'Ramírez Ibáñez', '18192021M', '1970-07-07', 'Transportista', 'Casado', '645673210', 'miguel.ramirez@example.com', 'Polígono Industrial Norte, Nave 12', '45007', 'Toledo', 'Toledo', 'activo', 'Cartera heredada')
  returning id into c14;

  -- Cliente con cumpleaños HOY (para demostrar la tarea automática de cumpleaños).
  insert into public.clientes (user_id, nombre, apellidos, dni_nie, fecha_nacimiento, profesion, estado_civil, telefono, email, direccion, codigo_postal, poblacion, provincia, estado, origen, notas)
  values (v_user, 'Lucía', 'Herrera Cano', '21222324N',
          make_date(1987, extract(month from current_date)::int, extract(day from current_date)::int),
          'Veterinaria', 'Casada', '656784321', 'lucia.herrera@example.com', 'Calle Nueva 17, 3ºA', '18001', 'Granada', 'Granada', 'activo', 'Recomendación', 'Hoy es su cumpleaños.')
  returning id into c15;

  -- ---------------------------------------------------------------------------
  -- PÓLIZAS (vencimientos relativos a hoy para el semáforo)
  -- ROJO (<30d): 4 · AMARILLO (30-60d): 5 · VERDE (>60d): resto · + vencidas
  -- ---------------------------------------------------------------------------

  -- ROJO: vencen en menos de 30 días
  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, matricula, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c1, 'Mapfre', 'MAP-AUTO-001', 'auto', '1234 KLM', 'Seat León 1.5 TSI', current_date + 5 - interval '1 year', current_date + 5, 480.50, 'anual', 'vigente',
    '[{"nombre":"Responsabilidad Civil","capital":"50.000.000 €","franquicia":"0 €"},{"nombre":"Daños propios","capital":"Valor venal","franquicia":"300 €"},{"nombre":"Asistencia en viaje","capital":"Ilimitado","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c3, 'Adeslas', 'ADE-SALUD-014', 'salud', 'Titular + 1 beneficiario', current_date + 12 - interval '1 year', current_date + 12, 1320.00, 'mensual', 'vigente',
    '[{"nombre":"Hospitalización","capital":"Ilimitado","franquicia":"0 €"},{"nombre":"Consultas","capital":"Sin límite","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c6, 'Allianz', 'ALZ-HOGAR-088', 'hogar', 'Vivienda 90m² Barcelona', current_date + 20 - interval '1 year', current_date + 20, 310.75, 'anual', 'vigente',
    '[{"nombre":"Continente","capital":"180.000 €","franquicia":"0 €"},{"nombre":"Contenido","capital":"40.000 €","franquicia":"150 €"},{"nombre":"RC familiar","capital":"300.000 €","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, matricula, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c14, 'Zurich', 'ZUR-AUTO-231', 'auto', '4567 BCD', 'Iveco Daily furgón', current_date + 28 - interval '1 year', current_date + 28, 920.00, 'semestral', 'vigente',
    '[{"nombre":"Responsabilidad Civil","capital":"50.000.000 €","franquicia":"0 €"},{"nombre":"Robo","capital":"Valor venal","franquicia":"0 €"}]'::jsonb);

  -- AMARILLO: vencen entre 30 y 60 días
  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c2, 'Generali', 'GEN-COM-045', 'comercio', 'Bar-cafetería 60m²', current_date + 35 - interval '1 year', current_date + 35, 640.00, 'anual', 'vigente',
    '[{"nombre":"Incendio","capital":"120.000 €","franquicia":"0 €"},{"nombre":"RC explotación","capital":"600.000 €","franquicia":"300 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c4, 'AXA', 'AXA-VIDA-072', 'vida', 'Vida-riesgo titular', current_date + 42 - interval '1 year', current_date + 42, 385.00, 'anual', 'vigente',
    '[{"nombre":"Fallecimiento","capital":"150.000 €","franquicia":"0 €"},{"nombre":"Invalidez","capital":"150.000 €","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c7, 'Mapfre', 'MAP-HOGAR-119', 'hogar', 'Chalet 200m² Málaga', current_date + 48 - interval '1 year', current_date + 48, 520.00, 'anual', 'vigente',
    '[{"nombre":"Continente","capital":"300.000 €","franquicia":"0 €"},{"nombre":"Contenido","capital":"60.000 €","franquicia":"150 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, matricula, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c11, 'Línea Directa', 'LD-AUTO-303', 'auto', '7890 FGH', 'Renault Clio', current_date + 55 - interval '1 year', current_date + 55, 395.00, 'anual', 'vigente',
    '[{"nombre":"Responsabilidad Civil","capital":"50.000.000 €","franquicia":"0 €"},{"nombre":"Lunas","capital":"Sin límite","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c12, 'Santalucía', 'SL-DEC-501', 'decesos', 'Titular + cónyuge', current_date + 60 - interval '1 year', current_date + 60, 240.00, 'anual', 'vigente',
    '[{"nombre":"Servicio de decesos","capital":"6.000 €","franquicia":"0 €"}]'::jsonb);

  -- VERDE: vencen a más de 60 días
  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, matricula, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c1, 'Allianz', 'ALZ-HOGAR-777', 'hogar', null, 'Vivienda 80m² Madrid', current_date + 90 - interval '1 year', current_date + 90, 285.00, 'anual', 'vigente',
    '[{"nombre":"Continente","capital":"150.000 €","franquicia":"0 €"},{"nombre":"Contenido","capital":"30.000 €","franquicia":"150 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c5, 'Adeslas', 'ADE-SALUD-205', 'salud', 'Titular', current_date + 120 - interval '1 year', current_date + 120, 780.00, 'mensual', 'vigente',
    '[{"nombre":"Consultas","capital":"Sin límite","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, matricula, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c8, 'Pelayo', 'PEL-AUTO-410', 'auto', '2468 JLM', 'Volkswagen Golf', current_date + 150 - interval '1 year', current_date + 150, 510.00, 'semestral', 'vigente',
    '[{"nombre":"Responsabilidad Civil","capital":"50.000.000 €","franquicia":"0 €"},{"nombre":"Todo riesgo con franquicia","capital":"Valor venal","franquicia":"400 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c9, 'Santalucía', 'SL-DEC-618', 'decesos', 'Titular', current_date + 200 - interval '1 year', current_date + 200, 180.00, 'anual', 'vigente',
    '[{"nombre":"Servicio de decesos","capital":"5.000 €","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c9, 'Mapfre', 'MAP-COMU-921', 'comunidad', 'Comunidad C/ Pilar 3', current_date + 240 - interval '1 year', current_date + 240, 1150.00, 'anual', 'vigente',
    '[{"nombre":"Continente","capital":"2.000.000 €","franquicia":"0 €"},{"nombre":"RC","capital":"600.000 €","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c11, 'AXA', 'AXA-RC-733', 'rc', 'RC profesional farmacia', current_date + 270 - interval '1 year', current_date + 270, 420.00, 'anual', 'vigente',
    '[{"nombre":"RC profesional","capital":"600.000 €","franquicia":"300 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, matricula, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c12, 'Zurich', 'ZUR-AUTO-844', 'auto', '3690 NPQ', 'BMW Serie 3', current_date + 300 - interval '1 year', current_date + 300, 690.00, 'anual', 'vigente',
    '[{"nombre":"Responsabilidad Civil","capital":"50.000.000 €","franquicia":"0 €"},{"nombre":"Todo riesgo","capital":"Valor a nuevo","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c7, 'Generali', 'GEN-ACC-955', 'accidentes', 'Titular', current_date + 330 - interval '1 year', current_date + 330, 150.00, 'anual', 'vigente',
    '[{"nombre":"Fallecimiento por accidente","capital":"60.000 €","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c15, 'Adeslas', 'ADE-SALUD-366', 'salud', 'Familia (3)', current_date + 360 - interval '1 year', current_date + 360, 1980.00, 'mensual', 'vigente',
    '[{"nombre":"Hospitalización","capital":"Ilimitado","franquicia":"0 €"},{"nombre":"Dental","capital":"Incluido","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, matricula, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c6, 'Línea Directa', 'LD-AUTO-477', 'auto', '5813 RST', 'Ford Focus', current_date + 95 - interval '1 year', current_date + 95, 430.00, 'anual', 'vigente',
    '[{"nombre":"Responsabilidad Civil","capital":"50.000.000 €","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c2, 'Mapfre', 'MAP-VIDA-582', 'vida', 'Vida ahorro', current_date + 400 - interval '1 year', current_date + 400, 600.00, 'anual', 'vigente',
    '[{"nombre":"Ahorro garantizado","capital":"25.000 €","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c3, 'Allianz', 'ALZ-HOGAR-693', 'hogar', 'Piso alquiler Valencia', current_date + 110 - interval '1 year', current_date + 110, 250.00, 'anual', 'vigente',
    '[{"nombre":"Contenido","capital":"25.000 €","franquicia":"150 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c4, 'Zurich', 'ZUR-COM-704', 'comercio', 'Oficina ingeniería', current_date + 175 - interval '1 year', current_date + 175, 540.00, 'anual', 'vigente',
    '[{"nombre":"Multirriesgo","capital":"150.000 €","franquicia":"300 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, matricula, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c8, 'Pelayo', 'PEL-MOTO-815', 'auto', '9517 UVW', 'Moto Honda PCX 125', current_date + 220 - interval '1 year', current_date + 220, 210.00, 'anual', 'vigente',
    '[{"nombre":"Responsabilidad Civil","capital":"50.000.000 €","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c14, 'AXA', 'AXA-RC-926', 'rc', 'RC transporte de mercancías', current_date + 260 - interval '1 year', current_date + 260, 880.00, 'anual', 'vigente',
    '[{"nombre":"RC","capital":"600.000 €","franquicia":"300 €"}]'::jsonb);

  -- VENCIDAS (para demostrar el estado gris)
  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c9, 'Generali', 'GEN-DEC-140', 'decesos', 'Póliza antigua', current_date - 15 - interval '1 year', current_date - 15, 165.00, 'anual', 'vencida',
    '[{"nombre":"Servicio de decesos","capital":"4.000 €","franquicia":"0 €"}]'::jsonb);

  insert into public.polizas (user_id, cliente_id, compania, numero_poliza, tipo, matricula, riesgo_asegurado, fecha_efecto, fecha_vencimiento, prima_anual, forma_pago, estado, coberturas)
  values (v_user, c5, 'Mapfre', 'MAP-AUTO-251', 'auto', '1470 XYZ', 'Coche anterior', current_date - 40 - interval '1 year', current_date - 40, 460.00, 'anual', 'anulada',
    '[{"nombre":"Responsabilidad Civil","capital":"50.000.000 €","franquicia":"0 €"}]'::jsonb);

  -- ---------------------------------------------------------------------------
  -- INTERACCIONES (timeline) — varias por cliente
  -- ---------------------------------------------------------------------------
  insert into public.interacciones (user_id, cliente_id, tipo, resumen, detalle, fecha) values
    (v_user, c1, 'llamada', 'Llamada de bienvenida a la campaña de renovación', 'Le comento que su seguro de coche vence pronto. Interesada en revisar coberturas. Quedamos en llamar la semana que viene.', now() - interval '3 days'),
    (v_user, c1, 'email', 'Enviado presupuesto de renovación auto', 'Adjunto comparativa Mapfre vs Allianz. Espera respuesta.', now() - interval '1 day'),
    (v_user, c2, 'reunion', 'Reunión en el bar para revisar póliza de comercio', 'Quiere ampliar cobertura de RC. Preparar propuesta.', now() - interval '10 days'),
    (v_user, c3, 'whatsapp', 'Consulta sobre cobertura dental en el seguro de salud', 'Le confirmo que la dental no está incluida en su modalidad actual.', now() - interval '5 days'),
    (v_user, c3, 'presupuesto', 'Presupuesto ampliación salud familiar', 'Enviado presupuesto para incluir a su pareja.', now() - interval '2 days'),
    (v_user, c4, 'llamada', 'Revisión anual de la póliza de vida', 'Todo correcto, sin cambios. Muy satisfecho.', now() - interval '20 days'),
    (v_user, c6, 'nota', 'Cliente pide bajar la prima del hogar', 'Valorar franquicia más alta para reducir prima.', now() - interval '7 days'),
    (v_user, c7, 'reunion', 'Visita al chalet para valoración de continente', 'Actualizado capital de continente a 300.000 €.', now() - interval '15 days'),
    (v_user, c9, 'llamada', 'Aviso de póliza de decesos vencida', 'Le informo de que su decesos venció. Quiere renovar con otra compañía.', now() - interval '4 days'),
    (v_user, c11, 'email', 'Documentación RC farmacia recibida', 'Recibido certificado. Póliza en vigor.', now() - interval '30 days'),
    (v_user, c12, 'cambio', 'Cambio de vehículo en póliza de auto', 'Actualizada matrícula por cambio de coche.', now() - interval '12 days'),
    (v_user, c14, 'whatsapp', 'Consulta sobre RC de transporte', 'Pregunta por cobertura en mercancía refrigerada.', now() - interval '6 days'),
    (v_user, c15, 'llamada', 'Alta seguro de salud familiar', 'Contratada póliza para toda la familia. Muy contenta.', now() - interval '45 days'),
    (v_user, c5, 'nota', 'Interesada en seguro de decesos', 'Comentar opciones en la próxima llamada.', now() - interval '8 days');

  -- ---------------------------------------------------------------------------
  -- TAREAS de ejemplo (manuales; las automáticas las genera el job diario)
  -- ---------------------------------------------------------------------------
  insert into public.tareas (user_id, cliente_id, tipo, titulo, descripcion, fecha_vencimiento, hora, estado) values
    (v_user, c1, 'llamar', 'Llamar a María para cerrar renovación de auto', 'Confirmar compañía elegida.', current_date, '10:00', 'pendiente'),
    (v_user, c3, 'enviar_comparativa', 'Enviar comparativa salud a Carmen', null, current_date, '12:30', 'pendiente'),
    (v_user, c6, 'recordar_pago', 'Recordar a Francisco el recibo del hogar', null, current_date, '17:00', 'pendiente'),
    (v_user, c2, 'reunion', 'Reunión con José por ampliación de RC', 'En el bar, a media mañana.', current_date + 2, '11:00', 'pendiente'),
    (v_user, c9, 'llamar', 'Llamar a Rosa por renovación decesos', null, current_date + 1, null, 'pendiente'),
    (v_user, c11, 'solicitar_documentacion', 'Pedir a Pilar renovación certificado RC', null, current_date + 5, null, 'pendiente'),
    (v_user, c4, 'otro', 'Preparar informe anual de Antonio', null, current_date - 2, null, 'pendiente'),
    (v_user, c7, 'llamar', 'Confirmar con Isabel el nuevo capital', null, current_date - 3, null, 'completada');

  update public.tareas set completada_at = now() - interval '3 days'
    where user_id = v_user and estado = 'completada';

  raise notice 'Seed completado para el usuario %.', v_user;
end $$;
