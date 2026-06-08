-- SQL Script: Actualización de Oferta Formativa en Supabase
-- Ejecutar este script en el editor SQL de Supabase (SQL Editor)

INSERT INTO ciclos_formativos (id, grupo, nombre, area_formativa, tema1, tema2, tema3, tema4, created_at, updated_at)
VALUES 
  -- a. PARA TODOS LOS ACTORES DEL SEP
  ('1SEP', 'PARA TODOS LOS ACTORES DEL SEP', 'Ofimática Básica para la Gestión y Planificación Educativa', 'PARA TODOS LOS ACTORES DEL SEP', 'Fundamentos de procesamiento de textos en el ámbito educativo', 'Gestión automatizada y sistemática del cuaderno pedagógico', 'Presentaciones interactivas aplicadas al ámbito educativo', 'Uso básico de internet en la práctica docente', NOW(), NOW()),
  ('2SEP', 'PARA TODOS LOS ACTORES DEL SEP', 'Gamificación e Innovación con Inteligencia Artificial', 'PARA TODOS LOS ACTORES DEL SEP', 'Uso y aplicación de herramientas y recursos digitales para la gamificación', 'Diseño de experiencias gamificadas en el aula', 'Evaluación y seguimiento en el aula gamificada', NULL, NOW(), NOW()),
  ('3SEP', 'PARA TODOS LOS ACTORES DEL SEP', 'Prevención, Detección, Actuación y Derivación de la Violencia en el Ámbito Educativo', 'PARA TODOS LOS ACTORES DEL SEP', 'Protección integral de niñas, niños y adolescentes en situaciones de violencia', 'Marco normativo e Instrumentos para la detección, actuación y derivación en casos de violencia', 'Procedimientos para la referencia y contra referencia en el proceso de restitución de derechos', NULL, NOW(), NOW()),
  ('4SEP', 'PARA TODOS LOS ACTORES DEL SEP', 'Educación Integral en Sexualidad', 'PARA TODOS LOS ACTORES DEL SEP', 'Sexualidad integral, derechos sexuales and derechos reproductivos', 'Prevención del embarazo en adolescentes y jóvenes', 'Prevención de ITS VIH/SIDA', NULL, NOW(), NOW()),
  ('5SEP', 'PARA TODOS LOS ACTORES DEL SEP', 'Adaptaciones Curriculares e Inclusión Educativa desde el Diseño Universal para el Aprendizaje', 'PARA TODOS LOS ACTORES DEL SEP', 'Diseño universal para el aprendizaje (DUA)', 'Estrategias para la discapacidad sensorial', 'Neurodiversidad y dificultades de aprendizaje', NULL, NOW(), NOW()),
  ('6SEP', 'PARA TODOS LOS ACTORES DEL SEP', 'Lengua de Señas Boliviana para Maestras, Maestros y otros actores del SEP', 'PARA TODOS LOS ACTORES DEL SEP', 'Comunidad sorda y la lengua de señas boliviana LSB', 'Desarrollo de habilidades comunicativas en LSB', 'Habilidades psicosociales, expresión corporal y facial como componentes de la Lengua de Señas Boliviana', 'Aplicación de procesos comunicativos en LSB', NOW(), NOW()),

  -- b. EDUCACION INICIAL EN FAMILIA COMUNITARIA
  ('1INI', 'EDUCACION INICIAL EN FAMILIA COMUNITARIA', 'Estimulación Oportuna y Detección del Desarrollo en Educación Inicial', 'EDUCACION INICIAL EN FAMILIA COMUNITARIA', 'Desarrollo integral en Educación Inicial', 'Instrumentos psicopedagógicos para la identificación del desarrollo integral en Educación Inicial', 'Estrategias pedagógicas para la estimulación integral', NULL, NOW(), NOW()),
  ('2INI', 'EDUCACION INICIAL EN FAMILIA COMUNITARIA', 'Desarrollo de Habilidades previas a la Lectura y Escritura en Educación Inicial', 'EDUCACION INICIAL EN FAMILIA COMUNITARIA', 'Desarrollo de la conciencia fonológica', 'Desarrollo de procesos en la comprensión lectora', 'Grafomotricidad para la lectura y escritura', NULL, NOW(), NOW()),
  ('3INI', 'EDUCACION INICIAL EN FAMILIA COMUNITARIA', 'Dinamizando la Educación Inicial en Familia Comunitaria No Escolarizada', 'EDUCACION INICIAL EN FAMILIA COMUNITARIA', 'Desarrollo integral y aprendizaje temprano', 'Estrategias para la atención en la diversidad y la participación comunitaria en el desarrollo integral', 'Factores que inciden en el desarrollo de la niña y el niño menor a 4 años', 'Contexto social y cultural de la primera infancia', NOW(), NOW()),

  -- c. EDUCACION PRIMARIA COMUNITARIA VOCACIONAL
  ('1PRI', 'EDUCACION PRIMARIA COMUNITARIA VOCACIONAL', 'Estrategias Didácticas para el Desarrollo de la Comprensión Lectora y Escritura Creativa en Educación Primaria', 'EDUCACION PRIMARIA COMUNITARIA VOCACIONAL', 'Herramientas de detección y estrategias para la mejora de la comprensión lectora', 'Didáctica de la lectura textual, inferencial o deductiva y critica', 'Escritura creativa para la producción de textos', NULL, NOW(), NOW()),
  ('2PRI', 'EDUCACION PRIMARIA COMUNITARIA VOCACIONAL', 'Didáctica del Pensamiento Lógico Matemático y Evaluación para el Aprendizaje Significativo', 'EDUCACION PRIMARIA COMUNITARIA VOCACIONAL', 'Herramientas de detección y estrategias pedagógicas para potenciar el pensamiento lógico matemático', 'Metodologías activas para la resolución de problemas', 'Evaluación inteligente para el aprendizaje significativo basado en problemas', NULL, NOW(), NOW()),

  -- d. EDUCACION SECUNDARIA COMUNITARIA PRODUCTIVA
  ('1SEC', 'EDUCACION SECUNDARIA COMUNITARIA PRODUCTIVA', 'Desarrollo de Competencias en Lectura Comprensiva y Producción Textual en Educación Secundaria', 'EDUCACION SECUNDARIA COMUNITARIA PRODUCTIVA', 'Estrategias para desarrollar la comprensión lectora en el aula', 'Técnicas para la redacción y argumentación escrita', 'Promoviendo la lectura crítica y escritura creativa', NULL, NOW(), NOW()),

  -- e. EDUCACION ALTERNATIVA
  ('1ALT', 'EDUCACION ALTERNATIVA', 'Aprendizaje Basado en Proyectos con Enfoque en Educación Productiva', 'EDUCACION ALTERNATIVA', 'Metodologías de aprendizaje basado en proyectos', 'Estrategias de aplicación de la metodología del aprendizaje basado en proyectos', 'Estrategias de evaluación para el aprendizaje basado en proyectos', NULL, NOW(), NOW()),
  ('2ALT', 'EDUCACION ALTERNATIVA', 'Gestión de Emprendimientos y Empleabilidad en Educación Técnica Tecnológica y Productiva', 'EDUCACION ALTERNATIVA', 'Ideas y plan de negocios para emprendimientos productivos', 'Marketing digital para emprendimientos productivos', 'Plan de acción y evaluación de proyectos de emprendimientos productivos', NULL, NOW(), NOW()),

  -- f. EDUCACION ESPECIAL
  ('1ESP', 'EDUCACION ESPECIAL', 'Estrategias Innovadoras para la Atención a Estudiantes con Dificultad de Aprendizaje en Educación Especial', 'EDUCACION ESPECIAL', 'Diseño de estrategias didácticas inclusivas y comunitarias para estudiantes con dificultades de aprendizaje', 'Tecnologías educativas para apoyar el aprendizaje de estudiantes con dificultades de aprendizaje', 'Desarrollo socioemocional de estudiantes con dificultades de aprendizaje', NULL, NOW(), NOW()),

  -- g. DOCENTES DE INSTITUTOS TECNICOS TECNOLOGICOS
  ('1TEC', 'DOCENTES DE INSTITUTOS TECNICOS TECNOLOGICOS', 'Asesoría y Tutoría en Modalidades de Graduación en Formación Técnica - Tecnológica', 'DOCENTES DE INSTITUTOS TECNICOS TECNOLOGICOS', 'Planificación y organización para el acompañamiento en las diferentes modalidades de graduación', 'Estrategias de seguimiento para la tutoría en las diferentes modalidades de graduación', 'Evaluación de las modalidades de graduación en formación técnica - tecnológica', NULL, NOW(), NOW()),

  -- h. TACFI
  ('1TAC', 'TACFI', 'Herramientas Tecnológicas Digitales Aplicadas en la Enseñanza de la Lengua Extranjera Inglés', 'TACFI', 'Fundamentos comunicativos en inglés para la formación docente', 'Inglés para la comunicación cotidiana y profesional', 'Inglés para la comunicación narrativa y reflexiva', NULL, NOW(), NOW()),
  ('2TAC', 'TACFI', 'Fortalecimiento de Habilidades Comunicativas y Liderazgo a través del Arte Escénico', 'TACFI', 'Fundamentos de comunicación y expresión escénica para la formación docente', 'Comunicación creativa y liderazgo pedagógico a través del arte escénico', 'Gestión y dominio del aula mediante estrategias de expresión escénica', NULL, NOW(), NOW()),
  ('3TAC', 'TACFI', 'Creación de textos didácticos con Inteligencia Artificial', 'TACFI', 'Diseño y estructuración de materiales educativos', 'Producción y edición de textos didácticos para el aula', 'Elaboración de recursos digitales y multiformato para entornos educativos', NULL, NOW(), NOW()),
  ('4TAC', 'TACFI', 'Producción Académica Asistida con Inteligencia Artificial', 'TACFI', 'Fundamentos y uso ético de la IA en la producción académica', 'Herramientas de inteligencia artificial para la investigación y redacción académica', 'Diseño y producción de materiales académicos con IA', NULL, NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  grupo = EXCLUDED.grupo,
  nombre = EXCLUDED.nombre,
  area_formativa = EXCLUDED.area_formativa,
  tema1 = EXCLUDED.tema1,
  tema2 = EXCLUDED.tema2,
  tema3 = EXCLUDED.tema3,
  tema4 = EXCLUDED.tema4,
  updated_at = NOW();
