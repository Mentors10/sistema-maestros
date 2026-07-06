# Reporte del Sistema de Control de Maestros

Fecha de actualizacion: 03/06/2026

## 1. Descripcion general

El Sistema de Control de Maestros es una aplicacion web creada en Google Apps Script con interfaz HTML, CSS y JavaScript. Su funcion es controlar cursos UNEFCO desde una sola pantalla: notas, grupos, calendario, agenda del organizador, participantes, formularios, fichas, enlaces de Drive, Google Maps y seguimiento de cumplimiento.

El sistema trabaja sobre una hoja principal de Google Sheets, y se conecta con Google Drive, Google Forms, Google Docs, hojas externas de participantes y, en algunas funciones, BigQuery.

## 2. Archivos principales

| Archivo | Funcion |
|---|---|
| `index.html` | Interfaz visual, estilos, calendario, filtros, tarjetas de notas y logica del navegador. |
| `code.gs` | Backend en Apps Script: lectura/escritura en Sheets, Drive, Forms, Docs, Maps, BigQuery y configuraciones globales. |
| `Reporte.md` | Documento tecnico y funcional de la aplicacion. |

## 3. Objetivo del sistema

El objetivo principal es organizar y controlar cursos por grupo, ciclo, facilitador, distrito, tecnico y calendario operativo. La aplicacion busca que el usuario vea rapidamente que cursos estan planificados, cuales estan proximos, cuales requieren socializacion, evaluacion o informe final, y cuantos participantes tiene cada curso.

Funciones principales:

- Crear, editar y eliminar cursos.
- Agrupar notas por nombre de grupo.
- Renombrar grupos y aplicar el cambio a todas las notas vinculadas.
- Cambiar color de cada nota desde la pantalla principal.
- Registrar organizador, celular, lugar, link de Google Maps, observaciones y link externo de inscripcion.
- Planificar `C1`, `C2`, `C3`, `C4`, `SOC1-4` y `EVAL1-4` desde un calendario visual.
- Mostrar fondos por curso y franjas suaves desde el inicio del curso hasta su socializacion.
- Marcar planificacion recibida, evaluacion realizada e informe final recibido.
- Controlar inscritos por formulario y participantes oficiales por hoja `ID`.
- Crear formularios de preinscripcion.
- Generar fichas de inscripcion.
- Gestionar hojas externas de participantes.
- Exportar participantes a SIE.

## 4. Flujo de carga inicial

Al abrir la aplicacion:

1. `doGet()` carga `index.html`.
2. El navegador inicia la aplicacion y llama al backend.
3. `getInitialPayload()` entrega:
   - ciclos formativos,
   - facilitadores,
   - tecnicos,
   - agenda de contactos,
   - notas/cursos desde `CONEXION`,
   - preferencia global de conteo de participantes.
4. `actualizarConexiones2()` enriquece cada curso con:
   - nombre del tecnico,
   - nombre del facilitador,
   - nombre del ciclo,
   - area formativa,
   - temas del ciclo.
5. El frontend renderiza grupos y tarjetas de notas.

## 5. Interfaz principal actual

La pantalla principal esta pensada para trabajar sin abrir ventanas grandes innecesarias. Cada nota muestra informacion operativa en una tarjeta compacta.

Controles principales:

- Buscador general.
- Filtro por preventivo.
- Filtro por mes.
- Filtro por tecnico.
- Orden por ID.
- Filtro de grupo.
- Filtro de alertas operativas.
- Boton `Cursos`.
- Boton `Actualizar`.
- Boton `Nuevo curso`.

El filtro de grupo permite concentrarse en un grupo especifico. Cuando se trabaja en un grupo, los demas pueden verse opacos para evitar confusion.

## 6. Tarjeta de nota

Cada nota contiene:

- ID del curso.
- Grupo.
- Area.
- Ciclo.
- Facilitador.
- Distrito.
- Fecha de inicio resumida.
- Lugar.
- Tecnico.
- Preventivo.
- Total estimado.
- Conteo de participantes `FORM` o `ID`.
- Datos del organizador.
- Color de nota.
- Calendario de actividades.
- Ubicacion exacta con Google Maps.
- Boton para compartir ubicacion.
- Botones operativos: editar, eliminar, participantes, herramientas, inscripcion online, ficha inscripcion, registro PEDG, editar form, on/off form y link publico.

## 7. Calendario por nota

Cada nota tiene su calendario visual propio. El calendario empieza en lunes y termina en domingo.

Actividades soportadas:

| Codigo | Significado |
|---|---|
| `C1` | Curso 1 |
| `C2` | Curso 2 |
| `C3` | Curso 3 |
| `C4` | Curso 4 |
| `SOC1` | Socializacion del curso 1 |
| `SOC2` | Socializacion del curso 2 |
| `SOC3` | Socializacion del curso 3 |
| `SOC4` | Socializacion del curso 4 |
| `EVAL1` | Evaluacion/verificador del curso 1 |
| `EVAL2` | Evaluacion/verificador del curso 2 |
| `EVAL3` | Evaluacion/verificador del curso 3 |
| `EVAL4` | Evaluacion/verificador del curso 4 |
| `PLAN` | Planificacion requerida o recibida |
| `INF1-4` | Informe final correspondiente a cada socializacion |

Al hacer clic en un dia se abre una mini ventana flotante donde se puede:

- seleccionar actividad,
- seleccionar hora de entrada,
- seleccionar hora de salida,
- agregar horario,
- eliminar horarios individuales,
- marcar checks contextuales si corresponde.

## 8. Colores del calendario

Los fondos del calendario ayudan a distinguir cursos:

- `C1` y `SOC1`: naranja.
- `C2` y `SOC2`: verde.
- `C3` y `SOC3`: lila.
- `C4` y `SOC4`: lila.
- `EVAL`: colores diferenciados por evaluacion.
- Dias intermedios entre inicio de curso y socializacion: fondo suave del curso correspondiente.

Las etiquetas `C1`, `C2`, `SOC`, `EVAL`, `INF`, etc. se muestran como texto grande y en negrita, sin burbuja, para mejorar lectura.

## 9. Navegacion del calendario

El calendario tiene navegacion mensual por flechas. Tambien permite desplazamiento con rueda del mouse por semanas, sin reconstruir toda la nota.

Importante:

- Al usar la rueda, solo se actualiza el calendario.
- No se recarga Google Maps.
- Al cambiar de mes con las flechas, el calendario vuelve a acomodarse por mes.

## 10. Reglas de socializacion, evaluacion e informe

La socializacion y evaluacion se asocian al curso correspondiente:

- Si se agrega `SOC` cerca o despues de `C1`, se guarda como `SOC1`.
- Si se agrega `SOC` cerca o despues de `C2`, se guarda como `SOC2`.
- Igual para `EVAL1-4`.
- Si no se puede inferir por fecha, se usa el primer numero faltante.

Cada `SOC` genera una marca de informe a los 5 dias:

- `SOC1` genera `INF1`.
- `SOC2` genera `INF2`.
- `SOC3` genera `INF3`.
- `SOC4` genera `INF4`.

Los checks globales actuales son:

- `PlanificacionRecibida`.
- `EvaluacionRealizada`.
- `InformeFinalRecibido`.

## 11. Alertas operativas

El sistema calcula alertas segun fechas y checks:

- Fecha de inicio pendiente.
- Curso proximo.
- Planificacion requerida.
- Planificacion atrasada.
- Curso en proceso.
- Socializacion pendiente.
- Evaluacion proxima.
- Evaluacion pendiente.
- Informe en plazo.
- Informe por vencer.
- Informe atrasado.
- Curso terminado o sin alertas criticas.

Estas alertas alimentan el filtro superior para localizar notas que requieren atencion.

## 12. Participantes

El sistema maneja dos conteos:

| Modo | Descripcion |
|---|---|
| `FORM` | Inscritos registrados por formulario. |
| `ID` | Participantes oficiales en la hoja `ID` del archivo de participantes. |

La preferencia `FORM` o `ID` se guarda globalmente con `PropertiesService`, por lo que aplica al sistema sin depender del equipo donde se ingrese.

Columnas de apoyo en `CONEXION`:

- `InscritosFormulario`.
- `InscritosID`.

Formulas sugeridas en Google Sheets:

Formulario:

```text
=SI($R2=""; ""; SI.ERROR(CONTARA(IMPORTRANGE($R2; "Respuestas de formulario 1!B2:B")); SI.ERROR(CONTARA(IMPORTRANGE($R2; "Form Responses 1!B2:B")); 0)))
```

Participantes oficiales:

```text
=SI($R2=""; ""; SI.ERROR(CONTARA(IMPORTRANGE($R2; "ID!D2:D")); 0))
```

Nota: en algunas configuraciones regionales Google Sheets puede requerir nombres de funciones en ingles o espaÃ±ol segun la hoja.

## 13. Base de datos principal: hoja `CONEXION`

La hoja `CONEXION` es la base principal de cursos. Si faltan columnas, `setupConexionSheet_()` las agrega segun `CON_HEADERS`.

Estructura exacta actual:

| Columna | Campo | Descripcion |
|---|---|---|
| A | `TecnicoCarnet` | Carnet o ID del tecnico responsable. |
| B | `CicloID` | Codigo del ciclo formativo. |
| C | `FacilitadorCarnet` | Carnet del facilitador. |
| D | `ID` | Identificador unico del curso/nota. |
| E | `Distrito` | Distrito educativo. |
| F | `Lugar` | Lugar de ejecucion del curso. |
| G | `AreaUrbanoRural` | Area urbana o rural. |
| H | `Segmento` | Segmento del curso. |
| I | `FechaInicio` | Fecha y hora inicial del curso. |
| J | `Estado` | Estado operativo, por ejemplo `POR EJECUTAR` o `EJECUTADO`. |
| K | `Observaciones` | Observaciones generales. |
| L | `Mostrar` | Visibilidad de la nota, normalmente `M` o `N`. |
| M | `Inscritos` | Inscritos manuales o estimados. |
| N | `Costo` | Costo por participante. |
| O | `TotalBs` | Total calculado. |
| P | `ContactoAgenda` | ID del contacto organizador vinculado. |
| Q | `LinkArchivo` | Carpeta Drive del curso. |
| R | `LinkSheetParticipantes` | Hoja externa de participantes. |
| S | `Mes` | Mes de ejecucion. |
| T | `Part` | Campo auxiliar de participantes. |
| U | `Prev` | Numero preventivo. |
| V | `FormUrl` | URL del formulario de preinscripcion. |
| W | `GrupoNombre` | Nombre del grupo operativo. |
| X | `GrupoColor` | Color asociado a nota/grupo. |
| Y | `GrupoTipo` | Tipo de agrupacion. |
| Z | `HorariosTentativos` | JSON del calendario de actividades. |
| AA | `InscritosFormulario` | Conteo por respuestas de formulario. |
| AB | `InscritosID` | Conteo oficial desde hoja `ID`. |
| AC | `LinkInscripcionExterno` | Link externo de lista/formulario/Google Sheet recibido. |
| AD | `PlanificacionRecibida` | Check de planificacion. Se guarda como `SI` o vacio. |
| AE | `EvaluacionRealizada` | Check de evaluacion/verificador. Se guarda como `SI` o vacio. |
| AF | `InformeFinalRecibido` | Check de informe final. Se guarda como `SI` o vacio. |

## 14. Formato de `HorariosTentativos`

`HorariosTentativos` guarda un JSON. Ejemplo:

```json
[
  {
    "date": "2026-06-13",
    "hour": 8,
    "minute": 0,
    "startTime": "08:00",
    "endHour": 12,
    "endMinute": 0,
    "endTime": "12:00",
    "hours": 4,
    "course": 1
  },
  {
    "date": "2026-06-18",
    "hour": 19,
    "minute": 30,
    "startTime": "19:30",
    "endHour": 21,
    "endMinute": 0,
    "endTime": "21:00",
    "hours": 1.5,
    "course": "soc1"
  },
  {
    "date": "2026-06-19",
    "hour": 20,
    "minute": 0,
    "startTime": "20:00",
    "endTime": "21:00",
    "hours": 1,
    "course": "eval1"
  }
]
```

Valores de `course`:

- Numeros `1`, `2`, `3`, `4` para cursos.
- Texto `soc1`, `soc2`, `soc3`, `soc4`.
- Texto `eval1`, `eval2`, `eval3`, `eval4`.
- Datos antiguos como `soc` o `eval` se mantienen compatibles.

## 15. Base de datos de agenda: hoja `AGENDA_CONTACTOS`

La hoja `AGENDA_CONTACTOS` se crea automaticamente si no existe.

Estructura actual:

| Columna | Campo | Descripcion |
|---|---|---|
| A | `ID_Contacto` | ID unico del contacto. |
| B | `TecnicoCarnet` | Tecnico asociado. |
| C | `Nombre` | Nombre del organizador/responsable. |
| D | `Telefono` | Celular o WhatsApp. |
| E | `Lugar` | Lugar, unidad educativa o institucion. |
| F | `Link_Maps` | Link de Google Maps o iframe embed. |
| G | `Descripcion` | Descripcion o pendientes. |
| H | `Fecha_Interaccion` | Fecha de ultima interaccion. |
| I | `Estado_Semaforo` | Estado de agenda, por ejemplo `Pendiente` o `Atendido`. |
| J | `Color` | Color asociado al contacto/lugar. |

La nota se vincula a un contacto mediante `ContactoAgenda` en `CONEXION`.

## 16. Hoja `CICLOS FORMATIVOS`

Esta hoja contiene grupos de ciclos, codigos, nombres y temas. La funcion `getCiclosFormativosGrouped()` lee rangos definidos manualmente.

Grupos actuales respetados en `code.gs`:

- `PARA TODOS LOS ACTORES DEL SEP`: `B3:G8`.
- `EDUCACION INICIAL EN FAMILIA COMUNITARIA`: `B11:G13`.
- `EDUCACION PRIMARIA COMUNITARIA VOCACIONAL`: `B16:G17`.
- `EDUCACION SECUNDARIA COMUNITARIA PRODUCTIVA`: `B20:G20`.
- `EDUCACION ALTERNATIVA`: `B23:G24`.
- `EDUCACION ESPECIAL`: `B27:G27`.
- `DOCENTES DE INSTITUTOS TECNICOS TECNOLOGICOS`: `B30:G30`.
- `TACFI`: `B33:G36`.

Cada fila leida contiene:

- ID del ciclo.
- Nombre del ciclo.
- Tema 1.
- Tema 2.
- Tema 3.
- Tema 4.

## 17. Hojas auxiliares del archivo principal

| Hoja | Funcion |
|---|---|
| `FACILITADOR` | Relaciona carnet con nombre de facilitador. |
| `TECNICO` | Relaciona carnet con nombre de tecnico. |
| `SIE UE` | Catalogo de codigo SIE y unidad educativa. |
| `REGISTROS PARTICIPANTES SIE` | Destino de exportacion de participantes hacia SIE. |
| `CONEXION` | Base principal de cursos. |
| `AGENDA_CONTACTOS` | Agenda de organizadores/lugares/contactos. |
| `CICLOS FORMATIVOS` | Catalogo de ciclos y temas. |

## 18. Hojas externas de participantes

Cada curso puede tener una hoja externa de participantes creada desde plantilla. Su link se guarda en `LinkSheetParticipantes`.

PestaÃ±as esperadas:

| PestaÃ±a | Funcion |
|---|---|
| `ID` | Datos oficiales de participantes. |
| `NOTAS` | Datos sincronizados para notas/calificaciones. |

La pestaÃ±a `ID` se lee con columnas:

| Columna | Campo |
|---|---|
| A | Nro |
| B | Apellidos |
| C | Nombres |
| D | CI |
| E | RDA |
| F | Celular |
| G | SIE |
| H | Unidad Educativa |
| I | Pagos |
| J | Observaciones |

Funciones relacionadas:

- `getParticipantesFromSheet()`.
- `addParticipantsToSheet()`.
- `sincronizarDatosIdANotas()`.
- `exportarParticipantesASie()`.

## 19. Google Drive

Variables importantes:

| Variable | Uso |
|---|---|
| `ROOT_FOLDER_ID` | Carpeta raiz donde se crean carpetas de cursos. |
| `PARTICIPANT_SHEET_TEMPLATE_ID` | Plantilla de hoja de participantes. |
| `TEMPLATE_ID` | Plantilla para asistencia. |
| `TARGET_EXPORT_FOLDER_ID` | Carpeta destino para documentos exportados. |
| `TEMPLATE_ID_FICHA_INSCRIPCION` | Plantilla de ficha de inscripcion. |
| `FOLDER_ID_FICHAS_INSCRIPCION` | Carpeta destino de fichas. |
| `FOLDER_ID_FORMULARIOS` | Carpeta donde se crean formularios. |
| `TEMPLATE_FORM_ID` | Plantilla de Google Form. |

El sistema puede crear:

- carpeta del curso,
- hoja de participantes,
- formulario de preinscripcion,
- ficha PDF,
- documento de asistencia.

## 20. Formularios de preinscripcion

Funciones relacionadas:

- `crearFormularioPreInscripcion()`.
- `generarFormularioFaltante()`.
- `toggleEstadoFormulario()`.
- `getDatosPublicosCurso()`.

El formulario se guarda en `FormUrl`.

La vista publica se abre con:

```text
?vistaPublica=ID_DEL_CURSO
```

## 21. Google Maps

El sistema acepta:

- lugar escrito,
- link normal de Google Maps,
- link corto `maps.app.goo.gl`,
- iframe embed de Google Maps.

Funciones relacionadas:

- `resolveGoogleMapsLink()`.
- `buildMapEmbedSrc()` en frontend.

Si se agrega o elimina horarios en el calendario, la aplicacion actualiza solo el calendario y no recarga el iframe de Maps para evitar parpadeos.

## 22. BigQuery y SIE

Variables:

- `BQ_PROJECT_ID`.
- `BQ_DATASET_ID`.
- `BQ_TABLE_ID`.

Funciones:

- `consultarBigQuery()`: consulta datos por CI.
- `getSieUeData()`: lee catalogo de unidades educativas.
- `buscarCodigosSieAI()`: sugiere codigos SIE.
- `guardarCodigosSie()`: guarda correcciones SIE.
- `exportarParticipantesASie()`: exporta participantes a `REGISTROS PARTICIPANTES SIE`.

## 23. Funciones principales del frontend

| Funcion | Uso |
|---|---|
| `renderizarNotas()` | Renderiza notas y grupos. |
| `renderGrupoMiniResumen()` | Renderiza el resumen del grupo. |
| `renderDashboardNoteCard()` | Dibuja la tarjeta completa de nota. |
| `renderNotaMiniControls()` | Dibuja campos de organizador, celular, maps, observaciones y link externo. |
| `renderNotaMiniCalendar()` | Dibuja el calendario por nota. |
| `openMiniDayPopover()` | Abre la mini ventana de dia. |
| `applyMiniDayAction()` | Agrega horario desde la mini ventana. |
| `deleteMiniDaySlot()` | Elimina horario individual. |
| `saveNotaMiniSlots()` | Guarda JSON de calendario. |
| `refreshCalendarViewsOnly()` | Actualiza calendario y alertas sin recargar Maps. |
| `renderComplianceStrip()` | Muestra avisos operativos. |
| `getNoteCompliance()` | Calcula alertas de planificacion, SOC, EVAL e informe. |
| `guardarOrganizadorNota()` | Guarda datos de agenda de la nota. |
| `compartirUbicacionNota()` | Copia o abre ubicacion de Maps. |

## 24. Funciones principales del backend

| Funcion | Uso |
|---|---|
| `getInitialPayload()` | Carga datos iniciales del sistema. |
| `setupConexionSheet_()` | Crea/prepara columnas de `CONEXION`. |
| `getConexiones()` | Lee cursos desde `CONEXION`. |
| `actualizarConexiones2()` | Enriquece cursos con tecnico, facilitador, ciclo y area. |
| `insertarConexion()` | Crea nuevo curso. |
| `updateConexion()` | Actualiza datos del curso. |
| `deleteConexion()` | Elimina curso y limpia recursos asociados. |
| `updateAgendaNota()` | Actualiza agenda, grupo, horarios, observaciones, link externo y checks. |
| `updateGrupoNotas()` | Renombra grupo de varias notas. |
| `getAgendaContactos()` | Lee agenda. |
| `saveContactoAgenda()` | Guarda contacto en agenda. |
| `saveAgendaNotaWithOptionalContacto()` | Crea o actualiza contacto vinculado a una nota. |
| `resolveGoogleMapsLink()` | Resuelve links cortos de Maps. |
| `generarFormularioFaltante()` | Crea o valida formulario de curso. |
| `generarFichaInscripcion()` | Genera ficha PDF. |
| `crearDocumentoAsistencia()` | Genera documento de asistencia. |

## 25. Reglas operativas recomendadas

1. Filtrar por mes.
2. Seleccionar grupo.
3. Revisar tarjetas visibles.
4. Registrar organizador, celular, Maps, observaciones y link externo.
5. Guardar datos de organizador.
6. Registrar `C1-C4`, `SOC1-4` y `EVAL1-4` desde calendario.
7. Revisar alertas de planificacion, evaluacion e informe.
8. Marcar checks cuando corresponda.
9. Usar `FORM/ID` para verificar participantes.
10. Abrir herramientas solo cuando sea necesario trabajar participantes o SIE.

## 26. Consideraciones tecnicas

- Apps Script requiere permisos para Sheets, Drive, Forms, Docs y UrlFetch.
- `IMPORTRANGE` puede requerir autorizacion manual en Sheets.
- Links cortos de Google Maps pueden depender de `UrlFetchApp`.
- Las actualizaciones parciales reducen parpadeos y mejoran rendimiento.
- El calendario guarda datos en JSON, por lo que debe mantenerse valido.
- Los checks actuales son globales por nota, no separados por cada `SOC1-4` o `EVAL1-4`.

## 27. Estado actual del sistema

El sistema esta orientado a control operativo por grupos y notas. La interfaz principal permite ver y modificar la informacion esencial sin desplegar ventanas grandes. El calendario ahora funciona como control central de ejecucion, socializacion, evaluacion e informe, con colores por curso y seguimiento visual de plazos.
# Reporte Next.js y Supabase: Explicacion funcional de migracion

Fecha de actualizacion: 04/06/2026

## 1. Proposito de esta seccion

Esta seccion explica como debe migrarse el sistema actual a Next.js y Supabase sin cambiar la forma de trabajo de los tecnicos. La prioridad no es redisenar el sistema ni agregar funciones nuevas, sino mantener todo igual en comportamiento, datos, botones, calendario, participantes, formularios, agenda, Google Maps y reportes.

La migracion debe respetar una regla central:

El sistema debe funcionar con Supabase como base de datos principal, pero Google Sheets debe seguir existiendo y comunicandose con la aplicacion durante el periodo de transicion, especialmente para inscripciones, participantes, formularios, ID y notas.

## 2. Que se quiere lograr con Next.js

La nueva version en Next.js debe replicar el sistema actual:

- Misma pantalla principal.
- Mismos filtros.
- Mismas tarjetas de notas.
- Mismos grupos.
- Mismo calendario por nota.
- Misma agenda por nota.
- Mismos botones operativos.
- Mismo conteo FORM/ID.
- Mismo manejo de Google Maps.
- Mismo manejo de formularios y hojas de participantes.

Next.js sera la nueva interfaz y capa de aplicacion. Supabase sera la nueva base de datos estructurada. Google Sheets seguira funcionando para los procesos que ya dependen de hojas y formularios.

## 3. Idea general de comunicacion

La comunicacion recomendada es:

```text
Usuario / Tecnico
   ↓
Aplicacion Next.js
   ↓
API interna de Next.js
   ↓                    ↓
Supabase            API Apps Script
                       ↓
                  Google Sheets / Forms / Drive
```

Next.js no debe hablar directamente con Google Sheets desde el navegador. Lo mas ordenado es que Next.js llame una API de Apps Script para operaciones relacionadas con Google Sheets, Forms y Drive.

Apps Script seguira siendo util porque ya tiene permisos y funciones para:

- leer y escribir en Google Sheets,
- crear formularios,
- consultar respuestas,
- leer hojas externas de participantes,
- trabajar con Drive,
- generar fichas,
- resolver algunos links de Maps,
- mantener compatibilidad con la estructura actual.

## 4. Por que mantener Supabase y Google Sheets al mismo tiempo

Supabase sera la base principal del sistema nuevo porque permite datos mas ordenados, consultas rapidas, relaciones, indices y una aplicacion mas estable.

Google Sheets debe mantenerse porque actualmente contiene piezas importantes del flujo real:

- La hoja `CONEXION` es la base operativa actual.
- En la columna `LinkSheetParticipantes` o `SHEETS` se guarda el Google Sheets de participantes del curso.
- Cada hoja de participantes contiene pestañas como `ID` y `NOTAS`.
- El formulario de preinscripcion escribe respuestas en una hoja de Google Sheets.
- Los tecnicos ya conocen y usan estas hojas.
- Algunas formulas de conteo dependen de `IMPORTRANGE`.
- Algunos procesos de inscripcion todavia dependen de Google Forms.

Por eso no se debe cortar Google Sheets de golpe. La migracion debe ser gradual.

## 5. Que datos deben vivir en Supabase

Supabase debe tener toda la base estructural del sistema:

- Cursos/notas.
- Grupos.
- Agenda.
- Organizadores.
- Tecnicos.
- Facilitadores.
- Ciclos formativos.
- Calendario por nota.
- Colores.
- Observaciones.
- Links de Maps.
- Links de Drive.
- Links de formularios.
- Links de hojas externas.
- Conteos de participantes.
- Checks de planificacion, evaluacion e informe.
- Catalogo SIE/UE.
- Participantes oficiales si se decide copiarlos desde Sheets.

Supabase debe convertirse en la fuente ordenada para la aplicacion Next.js.

## 6. Que datos seguiran en Google Sheets

Durante la transicion, Google Sheets debe conservar especialmente:

1. Formularios de inscripcion.
2. Respuestas de formularios.
3. Hojas externas de participantes guardadas en `LinkSheetParticipantes`.
4. Pestaña de respuestas del formulario dentro de esa hoja externa, cuando el formulario esta vinculado ahi.
5. Pestaña `ID`.
6. Pestaña `NOTAS`.
7. Archivos historicos ya creados.
8. Formulas existentes.
9. Exportaciones o estructuras que los tecnicos ya usan.

La columna `LinkSheetParticipantes` es clave porque apunta a la hoja externa del curso. Esa hoja externa no debe entenderse solamente como "participantes"; en la practica es el archivo operativo donde conviven respuestas del formulario, pestaña `ID` y pestaña `NOTAS`. Por eso la pantalla principal puede mostrar inscritos `FORM` y participantes oficiales `ID` al cambiar el selector.

Aunque Supabase tenga una copia de participantes, Google Sheets debe seguir funcionando para no romper el flujo actual.

## 7. Base de datos principal actual: `CONEXION`

La hoja `CONEXION` representa la tabla principal de cursos. En Supabase debe existir una tabla equivalente llamada, por ejemplo, `cursos`.

Cada fila de `CONEXION` es una nota/curso. La aplicacion actual convierte esa fila en una tarjeta visual.

### Campos principales de `CONEXION`

| Campo | Explicacion funcional | Destino en Supabase |
|---|---|---|
| `TecnicoCarnet` | Identifica al tecnico responsable. Sirve para filtrar y mostrar nombre del tecnico. | `cursos.tecnico_carnet` |
| `CicloID` | Codigo del ciclo formativo. Se cruza con `CICLOS FORMATIVOS`. | `cursos.ciclo_id` |
| `FacilitadorCarnet` | Identifica al facilitador. Se cruza con `FACILITADOR`. | `cursos.facilitador_carnet` |
| `ID` | Identificador unico de la nota/curso. Es el dato central para editar, eliminar, generar formulario y vincular recursos. | `cursos.id` |
| `Distrito` | Distrito educativo donde se ejecuta el curso. | `cursos.distrito` |
| `Lugar` | Lugar textual del curso. Tambien se usa como respaldo para Maps. | `cursos.lugar` |
| `AreaUrbanoRural` | Clasifica si el curso es urbano o rural. | `cursos.area_urbano_rural` |
| `Segmento` | Segmento de participantes o poblacion objetivo. | `cursos.segmento` |
| `FechaInicio` | Fecha inicial visible de la nota. Puede incluir hora. | `cursos.fecha_inicio_text` y opcionalmente `cursos.fecha_inicio` |
| `Estado` | Estado operativo: `POR EJECUTAR`, `EJECUTADO`, etc. | `cursos.estado` |
| `Observaciones` | Observaciones de la nota. | `cursos.observaciones` |
| `Mostrar` | Controla si la nota/formulario esta visible o no. | `cursos.mostrar` |
| `Inscritos` | Conteo manual o estimado. | `cursos.inscritos` |
| `Costo` | Costo por participante. | `cursos.costo` |
| `TotalBs` | Total calculado. | `cursos.total_bs` |
| `ContactoAgenda` | ID del organizador/contacto vinculado. | `cursos.contacto_agenda` |
| `LinkArchivo` | Link a carpeta Drive del curso. | `cursos.link_archivo` |
| `LinkSheetParticipantes` | Link al Google Sheets externo de participantes. Este campo es critico. | `cursos.link_sheet_participantes` |
| `Mes` | Mes de ejecucion usado para filtros. | `cursos.mes` |
| `Part` | Campo auxiliar actual. Debe conservarse. | `cursos.part` |
| `Prev` | Numero preventivo. | `cursos.prev` |
| `FormUrl` | Link del formulario de preinscripcion. | `cursos.form_url` |
| `GrupoNombre` | Nombre del grupo visual y operativo. | `cursos.grupo_nombre` |
| `GrupoColor` | Color de nota/grupo. | `cursos.grupo_color` |
| `GrupoTipo` | Tipo de agrupacion. | `cursos.grupo_tipo` |
| `HorariosTentativos` | JSON del calendario. Contiene C1-C4, SOC1-4, EVAL1-4, horas y fechas. | `cursos.horarios_tentativos` como `jsonb` |
| `InscritosFormulario` | Conteo desde respuestas de formulario. | `cursos.inscritos_formulario` |
| `InscritosID` | Conteo desde pestaña `ID` de la hoja externa. | `cursos.inscritos_id` |
| `LinkInscripcionExterno` | Link externo enviado por docentes, listas o formularios alternos. | `cursos.link_inscripcion_externo` |
| `PlanificacionRecibida` | Check de planificacion recibida. | `cursos.planificacion_recibida` |
| `EvaluacionRealizada` | Check de evaluacion realizada. | `cursos.evaluacion_realizada` |
| `InformeFinalRecibido` | Check de informe final recibido. | `cursos.informe_final_recibido` |

## 8. Punto clave: columna `LinkSheetParticipantes`

Este campo no es solo un link. Es una conexion a otra base de trabajo.

En el sistema actual, `LinkSheetParticipantes` apunta a un Google Sheets por curso. Ese archivo es el centro de trabajo de participantes del curso y puede contener:

- pestaña de respuestas del formulario, por ejemplo `Respuestas de formulario 1` o `Form Responses 1`,
- pestaña `ID`,
- pestaña `NOTAS`,
- registros oficiales,
- datos que los tecnicos revisan o corrigen.

Por eso `LinkSheetParticipantes` permite dos conteos visibles en la ventana principal:

- `FORM`: cantidad de registros capturados por formulario dentro de la hoja vinculada.
- `ID`: cantidad de participantes oficiales registrados en la pestaña `ID`.

En la migracion, Supabase debe guardar este link. Aunque luego se copie la informacion a tablas, el link debe mantenerse porque permite seguir abriendo la fuente original.

En Supabase debe existir:

```text
cursos.link_sheet_participantes
```

Y opcionalmente:

```text
participantes_curso.legacy_sheet_url
```

para saber de que archivo de Google Sheets vino cada participante.

## 9. Formulario, ID y NOTAS

El sistema actual maneja tres conceptos que no deben confundirse:

### 9.1 Formulario

El formulario de preinscripcion se guarda en `FormUrl`. Cuando una persona llena el formulario, las respuestas se guardan en Google Forms y normalmente se reflejan en una hoja de respuestas dentro del archivo vinculado por `LinkSheetParticipantes`.

Uso actual:

- contar inscritos por formulario,
- generar link publico,
- activar/desactivar inscripcion,
- revisar registros iniciales.

En Supabase se debe guardar:

```text
cursos.form_url
cursos.inscritos_formulario
```

Pero la fuente viva puede seguir siendo Google Forms/Sheets.

### 9.2 Pestaña `ID`

La pestaña `ID` de la hoja externa contiene participantes oficiales.

Campos esperados:

| Campo | Uso |
|---|---|
| Nro | Numero de participante |
| Apellidos | Apellidos |
| Nombres | Nombres |
| CI | Carnet |
| RDA | Registro docente |
| Celular | Telefono |
| SIE | Codigo de unidad educativa |
| Unidad Educativa | Nombre de unidad educativa |
| Pagos | Control de pagos |
| Observaciones | Observaciones |

En Supabase puede existir una tabla:

```text
participantes_curso
```

pero Google Sheets debe seguir sincronizado.

### 9.3 Pestaña `NOTAS`

La pestaña `NOTAS` contiene datos relacionados al registro academico o notas. Actualmente se sincroniza desde `ID` en algunos procesos.

En Supabase se puede modelar mas adelante como:

```text
participantes_notas
```

pero en la primera migracion conviene mantenerla en Google Sheets y comunicarse mediante API de Apps Script.

## 10. Comunicacion recomendada con Apps Script

Para que Next.js se comunique con Google Sheets, se recomienda mantener un Apps Script como API.

Next.js llamaria endpoints de Apps Script para:

- leer cursos desde `CONEXION`,
- escribir cambios en `CONEXION`,
- leer participantes desde hoja externa `ID`,
- escribir participantes en `ID`,
- sincronizar `ID` con `NOTAS`,
- contar respuestas de formulario,
- crear formulario faltante,
- activar/desactivar formulario,
- generar ficha,
- resolver recursos de Drive,
- exportar SIE.

La API de Apps Script funcionaria como puente con Google.

Ejemplo conceptual:

```text
Next.js API /api/cursos/10001/participantes
   ↓
Apps Script API getParticipantesFromSheet(linkSheetParticipantes)
   ↓
Google Sheets externo pestaña ID
   ↓
Respuesta JSON a Next.js
```

## 11. Supabase como base principal

Supabase debe guardar una copia estructurada de todo lo necesario para que la aplicacion sea rapida y ordenada.

Tablas sugeridas:

| Tabla | Funcion |
|---|---|
| `cursos` | Equivalente principal a `CONEXION`. |
| `agenda_contactos` | Equivalente a `AGENDA_CONTACTOS`. |
| `tecnicos` | Equivalente a `TECNICO`. |
| `facilitadores` | Equivalente a `FACILITADOR`. |
| `ciclos_formativos` | Equivalente estructurado de `CICLOS FORMATIVOS`. |
| `sie_ue` | Catalogo de unidades educativas y codigos SIE. |
| `participantes_curso` | Copia estructurada de pestaña `ID`. |
| `sync_log` | Registro de sincronizaciones entre Supabase y Sheets. |

## 12. Como debe funcionar la escritura de datos

Durante la migracion se recomienda usar escritura dual.

Cuando el usuario edita una nota en Next.js:

1. Next.js guarda el cambio en Supabase.
2. Next.js llama a Apps Script para guardar el mismo cambio en Google Sheets.
3. Si ambos guardados funcionan, se marca como sincronizado.
4. Si falla uno, se registra en `sync_log`.
5. La interfaz debe avisar si hay error critico, pero no debe perder el cambio.

Ejemplo:

```text
Usuario cambia Observaciones
   ↓
Next.js guarda cursos.observaciones en Supabase
   ↓
Next.js llama Apps Script updateAgendaNota()
   ↓
Apps Script actualiza columna Observaciones en CONEXION
   ↓
Next.js registra sync ok
```

## 13. Como debe funcionar la lectura de datos

Al inicio, lo mas seguro es leer desde Google Sheets y guardar copia en Supabase.

Luego, cuando la base este validada, Next.js puede leer principalmente desde Supabase.

Modos recomendados:

| Modo | Uso |
|---|---|
| `sheets-primary` | Google Sheets manda; Supabase copia. Inicio de migracion. |
| `dual-write` | Se escribe en ambos. Etapa de transicion. |
| `supabase-primary` | Supabase manda; Sheets se mantiene sincronizado. Etapa madura. |

No se recomienda iniciar con `supabase-only` porque romperia el flujo de participantes/formularios.

## 14. Funcionamiento de participantes en la migracion

Los participantes requieren trato especial porque viven en Google Forms y Google Sheets.

### Conteo FORM

El conteo `FORM` debe seguir saliendo de respuestas de formulario. En el sistema actual ese conteo se obtiene desde la hoja vinculada por `LinkSheetParticipantes`, revisando pestañas como:

- `Respuestas de formulario 1`
- `Form Responses 1`

Next.js puede pedir ese conteo a Apps Script o leer un valor sincronizado en Supabase.

### Conteo ID

El conteo `ID` debe salir de la pestaña `ID` de la misma hoja externa guardada en `LinkSheetParticipantes`. Apps Script puede leer ese archivo usando ese link.

Esta es la razon por la que en la ventana principal el usuario puede alternar `FORM` e `ID`: ambos conteos nacen del ecosistema Google Sheets vinculado al curso, pero representan estados distintos del participante.

### Copia a Supabase

Supabase puede tener una copia en `participantes_curso`, pero se debe recordar:

- Google Sheets sigue siendo fuente operativa durante la transicion.
- Supabase sirve para busquedas, reportes y velocidad.
- La sincronizacion debe respetar cambios en ambos lados.

## 15. Funcionamiento del calendario en Supabase

El calendario debe guardarse en Supabase como JSON, igual que ahora, pero usando tipo `jsonb`.

Campo:

```text
cursos.horarios_tentativos
```

Debe contener:

- fecha,
- hora de entrada,
- hora de salida,
- duracion,
- curso o actividad.

Ejemplo:

```json
[
  {
    "date": "2026-06-13",
    "startTime": "08:00",
    "endTime": "12:00",
    "hours": 4,
    "course": 1
  },
  {
    "date": "2026-06-18",
    "startTime": "19:00",
    "endTime": "20:00",
    "hours": 1,
    "course": "soc1"
  }
]
```

Reglas que deben mantenerse:

- `SOC` se convierte en `SOC1-4` segun el curso correspondiente.
- `EVAL` se convierte en `EVAL1-4` segun el curso correspondiente.
- Cada `SOC` genera una fecha de informe a 5 dias.
- Los fondos del calendario deben mantenerse por curso.
- La rueda del mouse mueve semanas.
- Las flechas cambian mes.
- El calendario empieza lunes.

## 16. Funcionamiento de agenda en Supabase

La agenda debe guardarse en:

```text
agenda_contactos
```

La nota se conecta con agenda mediante:

```text
cursos.contacto_agenda = agenda_contactos.id_contacto
```

Los campos importantes son:

- nombre del organizador,
- celular,
- lugar,
- link Maps,
- descripcion,
- color,
- tecnico responsable.

Al guardar datos del organizador desde la nota, Next.js debe:

1. Guardar o actualizar `agenda_contactos` en Supabase.
2. Guardar o actualizar `AGENDA_CONTACTOS` mediante Apps Script.
3. Actualizar `cursos.contacto_agenda`.
4. Actualizar `CONEXION.ContactoAgenda`.

## 17. Funcionamiento de Google Maps

Supabase solo guarda el texto o link:

```text
agenda_contactos.link_maps
```

o si se decide por nota:

```text
cursos.lugar
```

La vista en Next.js debe construir el iframe igual que ahora.

Si el link es corto `maps.app.goo.gl`, Next.js puede pedir a Apps Script que lo resuelva, porque Apps Script ya tiene funciones con `UrlFetchApp`.

## 18. Datos minimos que se deben entregar al programador Next.js

Para que la migracion salga bien, conviene entregar:

1. Este `Reporte.md` actualizado.
2. Una copia de la hoja `CONEXION` con datos reales o anonimizados.
3. Una copia de `AGENDA_CONTACTOS`.
4. Un ejemplo de hoja externa de participantes con pestañas `ID` y `NOTAS`.
5. Un ejemplo de formulario y su hoja de respuestas.
6. Ejemplos reales de `HorariosTentativos`.
7. Capturas de la interfaz actual.
8. Lista de botones que no se deben eliminar.
9. Reglas de colores del calendario.
10. Reglas de alertas.
11. Reglas de conteo `FORM/ID`.
12. URL o despliegue de Apps Script que funcionara como API.

## 19. Ideas utiles antes de programar

Antes de escribir codigo Next.js conviene decidir:

- Supabase sera lectura principal o copia al inicio.
- Google Sheets sera fuente principal durante cuantos meses.
- Que datos se sincronizan automaticamente.
- Que datos se sincronizan manualmente.
- Que pasa si Supabase guarda y Sheets falla.
- Que pasa si Sheets cambia fuera de Next.js.
- Si habra usuarios/login.
- Si cada tecnico vera solo sus cursos o todos.
- Si los participantes se copiaran completos a Supabase o solo conteos.

## 20. Recomendacion final para la migracion

La migracion debe hacerse con calma y por capas.

Primero se debe copiar exactamente la interfaz y comportamiento actual. Luego se conecta Supabase. Despues se mantiene comunicacion con Google Sheets mediante API de Apps Script. Finalmente, cuando los tecnicos ya trabajen sin notar cambios, se puede decidir si algunas partes dejan de depender de Sheets.

La parte mas delicada no es la interfaz: es la base de datos de participantes, porque hoy depende de formulario, hoja de respuestas, pestaña `ID`, pestaña `NOTAS` y links guardados en `CONEXION`. Por eso Supabase y Google Sheets deben convivir, comunicarse y sincronizarse durante la transicion.

