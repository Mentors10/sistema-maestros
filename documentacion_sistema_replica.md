# DOCUMENTACIÓN TÉCNICA Y GUÍA DE RÉPLICA
## Sistema de Control de Maestros e Itinerarios Formativos (UNEFCO)

Esta documentación proporciona una descripción exhaustiva del funcionamiento interno, la arquitectura, el modelo de datos, la lógica del cliente y del servidor del sistema, con el fin de permitir la réplica exacta de la aplicación sin omitir ningún detalle técnico ni funcional.

---

## 1. ARQUITECTURA GENERAL DEL SISTEMA

El sistema es una aplicación web moderna que sigue una arquitectura desacoplada para la gestión de datos operativos de los cursos formativos de la UNEFCO.

### Componentes de la Arquitectura
1. **Frontend (Next.js 16 + React 19):**
   - Implementado bajo la estrategia de renderizado en cliente (`'use client'`) para mantener la interactividad inmediata de la aplicación original en Google Apps Script.
   - Estilizado utilizando CSS puro (`src/app/globals.css`) con variables personalizadas (CSS Custom Properties) para el control del tamaño de fuente, colores y temas.
   - Utiliza **Lucide React** para los iconos y **SweetAlert2** para modales interactivos y alertas del navegador.

2. **Base de Datos Principal (Supabase / PostgreSQL):**
   - Almacena de manera estructurada los registros de cursos, técnicos, facilitadores, agenda de contactos, ciclos formativos, participantes e inscripciones.
   - Implementa triggers de base de datos para la auditoría de registros y funciones almacenadas (RPC) para la autenticación y cambio de contraseñas.

3. **Integración Externa (Google Drive, Sheets y Forms):**
   - **Google Forms / Hojas de Respuestas:** Los enlaces públicos de preinscripción registran las respuestas en hojas de Google Sheets externas.
   - **Google Drive:** Almacena los recursos de cada curso (asistencias, PDFs de fichas de inscripción, etc.).
   - **Hojas externas de participantes:** Archivos de Sheets individuales por curso (con pestañas `ID` y `NOTAS`) para la gestión en terreno por parte de los técnicos.

```
                  ┌──────────────────────────────┐
                  │       Frontend Next.js       │
                  └──────────────┬───────────────┘
                                 │
                        Llamadas HTTP / RPC
                                 │
            ┌────────────────────┴────────────────────┐
            ▼                                         ▼
┌───────────────────────┐                 ┌───────────────────────┐
│  Supabase (Postgres)  │                 │ Google Apps Script API│
└───────────────────────┘                 └───────────┬───────────┘
                                                      │
                                           ┌──────────┴──────────┐
                                           ▼                     ▼
                                    ┌─────────────┐       ┌─────────────┐
                                    │Google Sheets│       │Google Drive │
                                    └─────────────┘       └─────────────┘
```

---

## 2. MODELO DE DATOS COMPLETO (BASE DE DATOS)

El esquema de base de datos en Supabase está compuesto por las siguientes tablas, relaciones y restricciones de integridad.

### 2.1. Estructura de Tablas

#### Tabla 1: `usuarios_sistema`
Almacena las credenciales de acceso para técnicos y supervisores.
*   `id`: `UUID` (PRIMARY KEY, por defecto `gen_random_uuid()`)
*   `username`: `VARCHAR(50)` (UNIQUE, NOT NULL) - CI del usuario.
*   `password_hash`: `TEXT` (NOT NULL) - Almacena la contraseña (actualmente en texto plano para compatibilidad).
*   `rol`: `VARCHAR(20)` (NOT NULL) - Restringido mediante check a: `('tecnico', 'supervisor')`.
*   `nombre_completo`: `VARCHAR(150)` (NOT NULL)
*   `activo`: `BOOLEAN` (por defecto `true`)
*   `requiere_cambio_clave`: `BOOLEAN` (por defecto `true`) - Fuerza al usuario a cambiar su contraseña en su primer login.
*   `ultimo_acceso`: `TIMESTAMPTZ`
*   `created_at`: `TIMESTAMPTZ` (por defecto `NOW()`)
*   `updated_at`: `TIMESTAMPTZ` (por defecto `NOW()`)

#### Tabla 2: `registro_accesos`
Auditoría y registro de inicios y cierres de sesión.
*   `id`: `BIGSERIAL` (PRIMARY KEY)
*   `usuario_id`: `UUID` (FOREIGN KEY -> `usuarios_sistema(id)` ON DELETE SET NULL)
*   `username`: `VARCHAR(50)` (NOT NULL)
*   `rol`: `VARCHAR(20)` (NOT NULL)
*   `accion`: `VARCHAR(20)` (NOT NULL) - Restringido a: `('login', 'logout')`.
*   `ip_address`: `TEXT`
*   `user_agent`: `TEXT`
*   `created_at`: `TIMESTAMPTZ` (por defecto `NOW()`)

#### Tabla 3: `tecnicos`
Datos identificatorios de los técnicos de la UNEFCO.
*   `carnet`: `TEXT` (PRIMARY KEY) - CI del técnico.
*   `nombre`: `TEXT` (NOT NULL)
*   `created_at`: `TIMESTAMPTZ` (por defecto `NOW()`)
*   `updated_at`: `TIMESTAMPTZ` (por defecto `NOW()`)

#### Tabla 4: `facilitadores`
Datos de los facilitadores que dictan los cursos.
*   `carnet`: `TEXT` (PRIMARY KEY) - CI del facilitador.
*   `nombre`: `TEXT` (NOT NULL)
*   `created_at`: `TIMESTAMPTZ` (por defecto `NOW()`)
*   `updated_at`: `TIMESTAMPTZ` (por defecto `NOW()`)

#### Tabla 5: `ciclos_formativos`
Catálogo de ciclos e itinerarios formativos oficiales.
*   `id`: `TEXT` (PRIMARY KEY) - Código único de ciclo.
*   `grupo`: `TEXT` (NOT NULL) - Clasificación (ej: 'PARA TODOS LOS ACTORES DEL SEP', 'EDUCACION PRIMARIA').
*   `nombre`: `TEXT` (NOT NULL) - Nombre del ciclo formativo.
*   `area_formativa`: `TEXT` - Área de especialidad.
*   `tema1`: `TEXT` - Nombre del Curso 1 (C1).
*   `tema2`: `TEXT` - Nombre del Curso 2 (C2).
*   `tema3`: `TEXT` - Nombre del Curso 3 (C3).
*   `tema4`: `TEXT` - Nombre del Curso 4 (C4).
*   `created_at`: `TIMESTAMPTZ` (por defecto `NOW()`)
*   `updated_at`: `TIMESTAMPTZ` (por defecto `NOW()`)

#### Tabla 6: `agenda_contactos`
Directorio de organizadores y unidades educativas con semáforo de seguimiento.
*   `id_contacto`: `TEXT` (PRIMARY KEY, por defecto `gen_random_uuid()::text`)
*   `tecnico_carnet`: `TEXT` (FOREIGN KEY -> `tecnicos(carnet)` ON DELETE SET NULL)
*   `nombre`: `TEXT` - Nombre del organizador.
*   `telefono`: `TEXT` - Celular o contacto de WhatsApp.
*   `lugar`: `TEXT` - Unidad Educativa o sede física.
*   `link_maps`: `TEXT` - Enlace de Google Maps (Estándar, corto o Iframe).
*   `descripcion`: `TEXT` - Observaciones del contacto.
*   `fecha_interaccion`: `TIMESTAMPTZ`
*   `estado_semaforo`: `TEXT` (por defecto `'Pendiente'`)
*   `color`: `TEXT` (por defecto `'#2f80ed'`)
*   `created_at`: `TIMESTAMPTZ` (por defecto `NOW()`)
*   `updated_at`: `TIMESTAMPTZ` (por defecto `NOW()`)

#### Tabla 7: `cursos`
Tabla transaccional principal que contiene las notas o cursos asignados.
*   `id`: `TEXT` (PRIMARY KEY) - Código único de curso UNEFCO (ej: '10450').
*   `tecnico_carnet`: `TEXT` (FOREIGN KEY -> `tecnicos(carnet)` ON DELETE SET NULL)
*   `ciclo_id`: `TEXT` (FOREIGN KEY -> `ciclos_formativos(id)` ON DELETE SET NULL)
*   `facilitador_carnet`: `TEXT` (FOREIGN KEY -> `facilitadores(carnet)` ON DELETE SET NULL)
*   `distrito`: `TEXT` - Distrito educativo.
*   `lugar`: `TEXT` - Establecimiento o unidad educativa.
*   `area_urbano_rural`: `TEXT` - Tipo de zona (Urbano / Rural).
*   `segmento`: `TEXT` - Población meta (ej: Maestros, Directivos, etc.).
*   `fecha_inicio`: `TEXT` - Fecha de inicio programada en texto.
*   `estado`: `TEXT` (por defecto `'POR EJECUTAR'`) - Estados: `POR EJECUTAR`, `EJECUTADO`.
*   `observaciones`: `TEXT`
*   `mostrar`: `TEXT` (por defecto `'M'`) - Filtro lógico de visibilidad (`M` para visible, `N` para oculto).
*   `inscritos`: `INTEGER` (por defecto `0`) - Cantidad estimada o manual.
*   `costo`: `NUMERIC(10,2)` (por defecto `0.00`) - Costo unitario de inscripción por participante.
*   `total_bs`: `NUMERIC(10,2)` (por defecto `0.00`) - Monto total recaudado estimado.
*   `contacto_agenda`: `TEXT` (FOREIGN KEY -> `agenda_contactos(id_contacto)` ON DELETE SET NULL)
*   `link_archivo`: `TEXT` - Carpeta de Drive del curso.
*   `link_sheet_participantes`: `TEXT` - Enlace al Google Sheet externo del curso.
*   `mes`: `TEXT` - Mes de planificación.
*   `part`: `TEXT` - Conteo auxiliar.
*   `prev`: `TEXT` - Número de preventivo asignado por el sistema de pagos.
*   `form_url`: `TEXT` - Enlace del formulario de inscripción.
*   `grupo_nombre`: `TEXT` - Nombre del grupo operativo al que se asocia la nota.
*   `grupo_color`: `TEXT` (por defecto `'#2f80ed'`) - Color de la tarjeta de la nota.
*   `grupo_tipo`: `TEXT`
*   `horarios_tentativos`: `JSONB` (por defecto `'[]'::jsonb`) - Agenda interna del curso (C1-C4, SOC, EVAL).
*   `inscritos_formulario`: `INTEGER` (por defecto `0`) - Cantidad leída de preinscripciones activas.
*   `inscritos_id`: `INTEGER` (por defecto `0`) - Cantidad de participantes oficiales de la pestaña `ID`.
*   `link_inscripcion_externo`: `TEXT` - Enlace externo alternativo de inscripciones.
*   `planificacion_recibida`: `BOOLEAN` (por defecto `false`)
*   `evaluacion_realizada`: `BOOLEAN` (por defecto `false`)
*   `informe_final_recibido`: `BOOLEAN` (por defecto `false`)
*   `form_habilitado`: `BOOLEAN` (por defecto `true`)
*   `created_at`: `TIMESTAMPTZ` (por defecto `NOW()`)
*   `updated_at`: `TIMESTAMPTZ` (por defecto `NOW()`)

#### Tabla 8: `sie_ue`
Catálogo de unidades educativas del distrito para autocompletar códigos SIE.
*   `codigo_sie`: `TEXT` (PRIMARY KEY)
*   `unidad_educativa`: `TEXT` (NOT NULL)
*   `created_at`: `TIMESTAMPTZ` (por defecto `NOW()`)

#### Tabla 9: `participantes`
Base unificada de participantes registrados.
*   `ci`: `TEXT` (PRIMARY KEY) - Cédula de Identidad.
*   `apellidos`: `TEXT` (NOT NULL)
*   `nombres`: `TEXT` (NOT NULL)
*   `rda`: `TEXT` - Registro Docente Administrativo.
*   `celular`: `TEXT`
*   `sie`: `TEXT`
*   `unidad_educativa`: `TEXT`
*   `validado`: `BOOLEAN` (por defecto `false`) - Validación ante el SIE.
*   `observaciones_sie`: `TEXT`
*   `created_at`: `TIMESTAMPTZ` (por defecto `NOW()`)
*   `updated_at`: `TIMESTAMPTZ` (por defecto `NOW()`)

#### Tabla 10: `inscripcion_ciclo`
Tabla intermedia muchos a muchos que asocia participantes a cursos.
*   `id`: `BIGINT GENERATED ALWAYS AS IDENTITY` (PRIMARY KEY)
*   `curso_id`: `TEXT` (FOREIGN KEY -> `cursos(id)` ON DELETE CASCADE)
*   `participante_ci`: `TEXT` (FOREIGN KEY -> `participantes(ci)` ON DELETE CASCADE)
*   `nro`: `INTEGER` - Número de correlativo interno del curso.
*   `pagos`: `TEXT` (por defecto `'Pendiente'`)
*   `observaciones`: `TEXT`
*   `created_at`: `TIMESTAMPTZ` (por defecto `NOW()`)
*   `updated_at`: `TIMESTAMPTZ` (por defecto `NOW()`)
*   Restricción de unicidad: `UNIQUE(curso_id, participante_ci)`

#### Tabla 11: `sync_log`
Cola de sincronización pendiente entre Supabase y Google Sheets.
*   `id`: `BIGINT GENERATED ALWAYS AS IDENTITY` (PRIMARY KEY)
*   `tabla`: `TEXT` (NOT NULL)
*   `registro_id`: `TEXT` (NOT NULL)
*   `operacion`: `TEXT` (NOT NULL)
*   `estado`: `TEXT` (por defecto `'pendiente'`)
*   `error_message`: `TEXT`
*   `created_at`: `TIMESTAMPTZ` (por defecto `NOW()`)

---

### 2.2. Vistas Especiales de Base de Datos
Para optimizar las consultas y reducir el tráfico de red, se implementa la vista `cursos_enriquecidos`, la cual realiza los joins lógicos correspondientes para armar el objeto del curso completo:

```sql
CREATE OR REPLACE VIEW cursos_enriquecidos AS
SELECT
  c.*,
  t.nombre AS tecnico_nombre,
  f.nombre AS facilitador_nombre,
  cf.nombre AS ciclo_nombre,
  cf.grupo AS ciclo_grupo,
  cf.area_formativa,
  cf.tema1, cf.tema2, cf.tema3, cf.tema4,
  ac.nombre AS organizador_nombre,
  ac.telefono AS organizador_telefono,
  ac.lugar AS organizador_lugar,
  ac.link_maps AS organizador_maps,
  ac.descripcion AS organizador_descripcion,
  ac.estado_semaforo AS organizador_semaforo,
  ac.color AS organizador_color
FROM cursos c
LEFT JOIN tecnicos t ON c.tecnico_carnet = t.carnet
LEFT JOIN facilitadores f ON c.facilitador_carnet = f.carnet
LEFT JOIN ciclos_formativos cf ON c.ciclo_id = cf.id
LEFT JOIN agenda_contactos ac ON c.contacto_agenda = ac.id_contacto;
```

---

### 2.3. Funciones Almacenadas (RPC) y Triggers

1.  **Función de Login (`login_usuario`):**
    Valida las credenciales directas contra la tabla `usuarios_sistema`, registrando la fecha del último acceso de manera transaccional.
    ```sql
    CREATE OR REPLACE FUNCTION login_usuario(p_username TEXT, p_password TEXT)
    RETURNS TABLE(
      id UUID,
      username VARCHAR(50),
      rol VARCHAR(20),
      nombre_completo VARCHAR(150),
      requiere_cambio_clave BOOLEAN
    ) AS $$
    BEGIN
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
    ```

2.  **Función de Cambio de Contraseña (`cambiar_password`):**
    Permite actualizar la contraseña y desmarca el indicador de primer inicio de sesión.
    ```sql
    CREATE OR REPLACE FUNCTION cambiar_password(p_usuario_id UUID, p_new_password TEXT)
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
    ```

3.  **Auditoría de Inicios (`registrar_acceso`):**
    Inserta una entrada en el histórico de accesos cada vez que un usuario ingresa o sale del sistema.
    ```sql
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
    ```

4.  **Actualización de fecha automática (`update_updated_at`):**
    Trigger genérico para actualizar la columna `updated_at` en cambios.
    ```sql
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    ```

---

## 3. AUTENTICACIÓN, ROLES Y ACCESOS

El sistema maneja un control de accesos basado en roles (`UserRole` = `'tecnico' | 'supervisor'`).

### 3.1. Roles y Permisos
-   **Técnico (Usuario Regular):**
    -   Permisos de lectura y escritura totales en sus cursos.
    -   Puede crear, modificar y eliminar cursos.
    -   Puede registrar horarios, observaciones, organizadores e inscritos en la agenda.
    -   Visualiza el sistema con la etiqueta **"Técnico"**.
-   **Supervisor (Técnico Pedagógico - Administrador):**
    -   Acceso en modo **Solo Lectura (`readOnly = true`)** en todo el panel de tarjetas. No puede crear, editar ni eliminar cursos ni notas.
    -   Acceso al panel de **"Monitoreo de Técnicos"** y **"Ciclos Próximos"** (Vistas analíticas de avance y distritos).
    -   Visualiza la agenda de todos los contactos.
    -   Visualiza el sistema con la etiqueta **"Técnico Pedagógico"**.

### 3.2. Mecanismo de Sesión
-   **Almacenamiento:** Una vez autenticado mediante el RPC `login_usuario`, los datos del usuario se guardan en el `sessionStorage` bajo la clave `unefco_session`.
-   **Contexto React (`AuthContext`):** Expone las variables reactivas `user` (objeto de usuario), `isLoggedIn` (booleano), `isSupervisor` y `isTecnico`, además de los métodos encapsulados de `login()`, `logout()` y `changePassword()`.

---

## 4. FUNCIONAMIENTO DETALLADO DEL FRONTEND (DASHBOARD)

El dashboard principal consta de dos pestañas de visualización general: **Cursos** e **Agenda**, seleccionables en el menú superior.

### 4.1. Controles Globales (Header y Barra de Herramientas)
-   **Lupa (Zoom del Sistema):**
    -   Permite aumentar y disminuir el tamaño general de la letra de la interfaz entre el 75% (`10px`) y el 150% (`20px`) tomando como base `13px`.
    -   La preferencia se guarda en el `localStorage` (`'font-size'`) y se aplica dinámicamente configurando una variable CSS global en el elemento raíz del HTML:
        ```typescript
        document.documentElement.style.setProperty('--base-font-size', parsedSize + 'px');
        ```
-   **Barra de Filtros Lateral (Filtros e Itinerario):**
    -   **Buscador general:** Realiza coincidencias de texto completo (Fuzzy-like) comparando contra ID, nombre de grupo, lugar, distrito, nombres de técnicos, facilitadores, organizadores, preventivo y ciclo formativo.
    -   **Preventivo:** Filtra por número exacto de preventivo.
    -   **Mes:** Filtra de acuerdo al mes asignado a los cursos (ej: ENE, FEB, JUN).
    -   **Técnico:** Selección por combo que aisla cursos administrados por un técnico específico.
    -   **Grupo:** Aísla las tarjetas del grupo seleccionado. Al filtrar por un grupo en particular, las demás tarjetas disminuyen su opacidad a fin de priorizar el enfoque del usuario.
    -   **Alerta:** Filtrado exclusivo por tipo de alerta de compliance (ver sección 6).

---

## 5. VISTAS DE CURSOS

En el modo **Cursos**, el sistema permite alternar la estructuración de la información mediante tres vistas diferenciadas.

### 5.1. Vista Grupal
-   **Agrupación:** Agrupa las tarjetas de los cursos por el campo `grupo_nombre`.
-   **Orden de Grupos Personalizable:**
    -   Los grupos pueden ordenarse de forma manual. El orden actual de los títulos se recupera y persiste en el `localStorage` mediante la clave `grupo_orden`.
    -   Cada bloque de grupo cuenta con un mini resumen que muestra el **Total de Cursos** del grupo, el **Total de Inscritos** y el **Presupuesto Estimado Acumulado (Bs)**.
    -   Los grupos se pueden expandir y colapsar para despejar el área de trabajo.

### 5.2. Vista por Área Formativa
-   **Agrupación:** Organiza la interfaz por los campos de `area_formativa` (TACFI, TIC, GENERAL, INCLUSIVA, LENGUAS, etc.).
-   **Prioridad de Ordenamiento:**
    Las áreas formativas se ordenan de acuerdo a una jerarquía estricta definida a nivel de código (`getAreaPriority`):
    1.  `PARA TODOS LOS ACTORES DEL SEP`
    2.  `EDUCACION REGULAR`
    3.  `EDUCACION INICIAL EN FAMILIA COMUNITARIA`
    4.  `EDUCACION PRIMARIA COMUNITARIA VOCACIONAL`
    5.  `EDUCACION SECUNDARIA COMUNITARIA PRODUCTIVA`
    6.  `EDUCACION ALTERNATIVA Y ESPECIAL`
    7.  `EDUCACION ALTERNATIVA`
    8.  `EDUCACION ESPECIAL`
    9.  `EDUCACION SUPERIOR DE FORMACION PROFESIONAL`
    10. `DOCENTES DE INSTITUTOS TECNICOS TECNOLOGICOS`
    11. `TACFI`
-   **Lógica de Ciclos Formativos Internos:**
    Dentro de cada área, los cursos se agrupan por ciclo formativo y se ordenan por su prioridad interna definida en el arreglo global `priorityOrder` (`getCyclePriority`). Los cursos que no estén clasificados se envían al final del listado.

### 5.3. Vista por Estados
-   **Agrupación:** Divide los cursos en dos grandes columnas: **Confirmados** y **Proyectados**.
-   **Lógica de clasificación:** Un curso se considera **Confirmado** si el campo `facilitador_nombre` existe, no está vacío y no contiene la subcadena "por confirmar" (insensible a mayúsculas). De lo contrario, se clasifica como **Proyectado**.

---

## 6. LA TARJETA DE CURSO (NOTA CARD)

Cada tarjeta representa un curso operativo y contiene datos compactos de alto valor de consulta.

```
┌────────────────────────────────────────────────────────┐
│ [ID: 10450]  Grupo: Primaria Mejoras  [Color Picker]   │
├────────────────────────────────────────────────────────┤
│ Ciclo: Estrategias Didácticas de Comprensión Lectora   │
│ Facilitador: Prof. Ana Torres     Técnico: Juan Pérez  │
│ Distrito: La Paz 1      Lugar: U.E. Simón Bolívar (Maps)│
├────────────────────────────────────────────────────────┤
│ [MINI CALENDARIO OPERATIVO - MENSUAL]                  │
├────────────────────────────────────────────────────────┤
│ Total Est.: 3,500.00 Bs  │ Selector: [ FORM / ID ] 28  │
├────────────────────────────────────────────────────────┤
│ [BOTONES OPERATIVOS: Editar, Eliminar, Part., Herram.] │
└────────────────────────────────────────────────────────┘
```

### 6.1. Cálculo del Presupuesto Estimado (`Total Bs`)
El presupuesto se calcula multiplicando:
$$\text{Total Bs} = \text{Inscritos (Formulario o manual)} \times \text{Costo por Participante} \times \text{Cantidad de Cursos del Ciclo}$$
*Nota:* La cantidad de cursos del ciclo corresponde a la suma de temas no vacíos (`tema1` a `tema4`) definidos para el ciclo formativo asociado en la tabla `ciclos_formativos`. Si un ciclo no tiene temas configurados, se asume un multiplicador de `1`.

### 6.2. Selector de Participantes (`FORM` vs `ID`)
Permite conmutar la métrica de estudiantes activos que se visualiza en la esquina de la tarjeta:
-   **FORM (Inscritos Formulario):** Muestra el conteo de registros leídos de la tabla de preinscripciones / base Supabase (`inscritos_formulario`).
-   **ID (Oficiales):** Muestra la cifra de participantes confirmados en la hoja externa `ID` sincronizada en `inscritos_id`.

### 6.3. Calendario Operativo por Tarjeta
Un mini calendario integrado que funciona como centro de planificación y control.
-   **Navegación:** Desplazamiento por meses mediante botones de flecha o desplazamiento rápido (scroll/rueda del ratón) de semana en semana para evitar reconstrucciones costosas del componente de mapas.
-   **Lógica de Slots de Actividades:**
    El campo `horarios_tentativos` almacena un array en formato JSONB con los turnos y actividades. Los tipos de turnos válidos y sus colores visuales son:
    -   `1` a `4` (Cursos): Color naranja para C1 y SOC1; verde para C2 y SOC2; lila para C3/SOC3 y C4/SOC4.
    -   `soc1` a `soc4` (Socializaciones): Mismo color asignado al curso correspondiente.
    -   `eval1` a `eval4` (Evaluaciones): Color diferenciado para identificación rápida.
    -   `PLAN` (Planificación recibida): Indica hitos.
    -   `INF1` a `INF4` (Informe final): Planificados por defecto para aparecer 5 días posteriores a sus respectivas socializaciones (`SOC`).
-   **Interactividad del Popover:**
    -   Al hacer clic sobre un día se abre una ventana popover para agregar o eliminar actividades.
    -   **Comportamiento de Cierre:** Para agilizar la interacción, hacer clic en el mismo día activo que abrió el popover causa que la ventana se cierre de manera inmediata, eliminando la obligatoriedad de buscar el botón "Cerrar".
    -   No dispone de previsualizaciones automáticas flotantes sobre el hover del ratón (desactivado por comodidad a petición del usuario).
    -   El posicionamiento de la ventana emergente calcula límites para evitar superponerse y tapar la sección de ubicación (Distrito/Lugar) superior.

---

## 7. REGLAS DE COMPLIANCE Y ALERTAS OPERATIVAS

El sistema calcula de manera dinámica en el cliente una colección de alertas basada en los tiempos del calendario y marcas booleanas de control:

| Código de Alerta | Nombre Visual | Nivel de Severidad | Lógica de Disparo |
|---|---|---|---|
| `sin-fecha` | Sin fechas programadas | `warn` (Amarillo) | El curso no se ha marcado como EJECUTADO y no posee ningún slot registrado en el calendario. |
| `informe-atrasado` | Informe atrasado | `danger` (Rojo + Pulso) | Curso EJECUTADO, `informe_final_recibido` es `false`, existe un slot `SOC` y han transcurrido más de 10 días desde la socialización. |
| `informe-por-vencer` | Informe por vencer | `warn` (Amarillo + Pulso) | Curso EJECUTADO, `informe_final_recibido` es `false`, existe un slot `SOC` y han transcurrido entre 3 y 10 días desde la socialización. |
| `completo` | Curso completado | `ok` (Verde) | Curso EJECUTADO con `planificacion_recibida`, `evaluacion_realizada` e `informe_final_recibido` en `true`. |
| `planificado` | Inicia en X días | `info` (Azul) | Faltan más de 14 días para la fecha del primer curso programada en el calendario. |
| `proximo` | Próximo (X días) | `warn` (Amarillo + Pulso) | Faltan entre 3 y 14 días para la fecha del primer curso programado. |
| `inminente` | ¡Inicia en X días! | `danger` (Rojo + Pulso) | Falta entre 1 y 3 días para la fecha del primer curso programado. |
| `hoy` | ¡Curso hoy! | `danger` (Rojo + Pulso) | La fecha del primer curso coincide con el día actual. |
| `en-proceso` | Curso en proceso | `info` (Azul) | La fecha actual se encuentra entre la primera y la última fecha de cursos planificadas. |
| `curso-terminado` | Marcar ejecutado | `warn` (Amarillo) | La fecha del último curso programado ya pasó, pero el curso sigue marcado como `POR EJECUTAR`. |
| `planificacion-requerida`| Planificación requerida | `warn` (Amarillo) | `planificacion_recibida` es `false`, y faltan 7 días o menos para el inicio del curso. |
| `planificacion-atrasada` | Planificación atrasada | `danger` (Rojo + Pulso) | `planificacion_recibida` es `false`, y el curso ya ha iniciado. |
| `soc-pendiente` | SOC sin programar | `warn` (Amarillo) | Existen cursos registrados, pero no se ha programado ninguna fecha de socialización (`SOC`). |
| `eval-proxima` | Evaluación en X días | `warn` (Amarillo + Pulso) | `evaluacion_realizada` es `false` y falta una fecha de evaluación que ocurrirá dentro de 3 días o menos. |
| `eval-pendiente` | Evaluación pendiente | `danger` (Rojo + Pulso) | `evaluacion_realizada` es `false` y existe una fecha de evaluación registrada que ya pasó en el calendario. |

---

## 8. MÓDULOS Y VENTANAS COMPLEMENTARIAS

### 8.1. Modal de Participantes
Permite ver e interactuar con la lista de inscritos oficiales.
-   **Campos mostrados:** CI, Apellidos, Nombres, RDA, Celular, SIE, Unidad Educativa, Estado de Pago, Observaciones y Estado de Validación.
-   **Validación de Código SIE:** Cuenta con un buscador que consulta la tabla `sie_ue` para autocompletar el nombre de la Unidad Educativa asociada al código ingresado.

### 8.2. Modal de Herramientas
Centraliza las interacciones externas y utilidades del curso:
1.  **Enlaces Directos:** Accesos a la carpeta de Google Drive del curso (`LinkArchivo`), el Google Sheet de notas (`LinkSheetParticipantes`) y el enlace externo de preinscripción.
2.  **Operaciones en lote:** Acciones para generar y actualizar el formulario de preinscripción del curso, generar PDF de ficha de preinscripción y sincronizar datos.

### 8.3. Componente de Ubicación (Google Maps)
La tarjeta del curso extrae y valida el enlace de Maps proporcionado en la agenda del organizador o curso.
-   **Soporte de Links:** Reconoce enlaces largos, urls acortadas (`maps.app.goo.gl`) e IFrames de incrustación HTML.
-   **Renderizado:** Extrae mediante expresiones regulares los parámetros del enlace para estructurar un `iframe` seguro apuntando a `https://maps.google.com/maps?q=...&z=15&output=embed` para evitar caídas del componente.

---

## 9. MOTOR DE EXPORTACIÓN EXCEL (`excelExport.ts`)

El sistema cuenta con un generador de reportes de alta calidad estética en el cliente para la vista de **Áreas Formativas**.

### 9.1. Reglas de Negocio del Reporte
-   **Formato de salida:** Archivo Excel `.xlsx` descargado de forma directa.
-   **Pestañas:** Se genera **una sola hoja** de cálculo titulada "Reporte por Áreas".
-   **Agrupamiento:** La información se desglosa por Área Formativa (siguiendo el orden de prioridad del sistema) y a su vez por Ciclo Formativo.
-   **Filas de Subtotal:** Cada Ciclo Formativo calcula la sumatoria de inscritos y presupuesto acumulado.
-   **Filas de Total:** Cada Área Formativa muestra el consolidado de sus ciclos.
-   **Total General Consolidado:** Cierra el reporte sumando todos los registros procesados.

### 9.2. Diseño Estético y Estilos Aplicados (mediante `xlsx-js-style`)
-   **Visualización:** Se fuerza a Excel a renderizar las líneas de cuadrícula (`showGridLines: true`).
-   **Tipografía:** Fuente corporativa `Segoe UI`.
-   **Fondo de Celdas:**
    -   Área Formativa: Relleno sólido Verde Teal (`#0F766E`) con texto blanco y tamaño `11px` en negrita.
    -   Cabecera de Columnas: Relleno Slate Gris Oscuro (`#334155`) con texto blanco negrita.
    -   Filas de datos: Renglones alternados con blanco (`#FFFFFF`) y gris suave (`#F8FAFC`).
    -   Subtotales de Ciclos: Fondo gris claro (`#F1F5F9`) y bordes superior/inferior.
    -   Totales de Área: Fondo gris oscuro suave (`#E2E8F0`) con borde inferior mediano.
    -   Total General: Resaltado en color verde menta pastel (`#CCFBF1`) con letras verdes oscuras (`#0F766E`) y borde doble.
-   **Anchos de columnas:** Ajuste adaptativo basado en la longitud de las cadenas de datos + 3 caracteres de margen.

---

## 10. GUÍA PASO A PASO PARA LA RÉPLICA DEL SISTEMA

Siga estas instrucciones detalladas para levantar y replicar el sistema de manera íntegra en un nuevo servidor de desarrollo o producción.

### Paso 1: Configurar la Base de Datos en Supabase
1.  Cree un nuevo proyecto en la consola de Supabase.
2.  Acceda al menú **SQL Editor** y ejecute de manera secuencial los scripts contenidos en `supabase_schema.sql` y `login_usuarios.sql`. Esto creará las tablas, vistas relacionales, índices de desempeño, triggers para auditoría y los procedimientos RPC de autenticación.
3.  Compruebe que se hayan insertado las tuplas por defecto para los técnicos e itinerarios formativos piloto.

### Paso 2: Configurar las Variables de Entorno
Cree un archivo `.env.local` en la raíz del proyecto web (Next.js) con el siguiente contenido, reemplazando con las llaves de API provistas en la consola de Supabase:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<TU-PROJECT-ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<TU-ANON-PUBLIC-KEY>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<TU-ANON-PUBLIC-KEY>

# Gemini AI (Para lecturas y análisis de archivos si aplica)
GEMINI_API_KEY=AIzaSy...
```

### Paso 3: Estructura del Código Fuente
Asegúrese de clonar u organizar los archivos en el árbol del proyecto Next.js de la siguiente forma:

```text
├── package.json
├── next.config.ts
├── tsconfig.json
└── src
    ├── types
    │   └── index.ts                 # Declaración de tipos e interfaces de datos
    ├── lib
    │   ├── supabase
    │   │   └── client.ts            # Inicialización del cliente Supabase
    │   ├── auth
    │   │   └── AuthContext.tsx      # Lógica de estados de sesión y RPCs
    │   └── utils
    │       ├── compliance.ts        # Lógica de cálculo de estados y alertas operativas
    │       └── excelExport.ts       # Generador de reportes en una sola hoja (styled)
    ├── components
    │   ├── auth
    │   │   ├── LoginPage.tsx        # Pantalla de inicio de sesión
    │   │   └── ChangePasswordPage.tsx# Pantalla de restablecimiento de contraseña
    │   ├── agenda
    │   │   ├── AgendaCard.tsx       # Tarjeta de contacto
    │   │   └── AgendaForm.tsx       # Formulario de contacto
    │   ├── cursos
    │   │   ├── CursoForm.tsx        # Crear y editar cursos
    │   │   ├── GrupoCard.tsx        # Agrupador de tarjetas en el dashboard
    │   │   └── NotaCard.tsx         # Tarjeta operativa del curso y mini-calendario
    │   └── participantes
    │       └── ParticipantesModal.tsx# Visor y validador de participantes inscritos
    └── app
        ├── layout.tsx               # Layout principal con variables de fuentes
        ├── globals.css              # Estilos visuales del sistema
        └── page.tsx                 # Controlador principal y contenedor del dashboard
```

### Paso 4: Instalar las Dependencias de Node.js
Ejecute la instalación de dependencias necesarias desde la terminal del proyecto:
```bash
npm install @supabase/supabase-js framer-motion lucide-react sweetalert2 xlsx-js-style
npm install --save-dev @types/node @types/react @types/react-dom eslint typescript
```

### Paso 5: Probar y Compilar
1.  **Ejecutar localmente:**
    ```bash
    npm run dev
    ```
2.  **Verificar compilación limpia de tipos TypeScript:**
    ```bash
    npx tsc --noEmit
    ```
3.  **Compilar para producción:**
    ```bash
    npm run build
    ```

### Paso 6: Verificación de Flujo
1.  Acceda al login utilizando las credenciales de prueba (`7782629` con contraseña `123456` para Técnico; u `8888888` con contraseña `123456` para Supervisor).
2.  El sistema detectará que requiere cambio de contraseña; complete el formulario para activar la sesión normal.
3.  Valide que, al iniciar sesión como Técnico, se habiliten las opciones de edición e inserción, mientras que el rol de Supervisor deshabilite los botones de escritura (modo Solo Lectura).
4.  Cargue la vista "Áreas" y compruebe la descarga profesional del reporte en Excel haciendo clic en "Exportar Excel".
