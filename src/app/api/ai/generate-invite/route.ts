import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { curso, linkInscripcion } = await request.json();

    if (!curso) {
      return NextResponse.json(
        { success: false, message: 'Faltan los datos del curso' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'API Key de Gemini no configurada en el servidor. Agrega GEMINI_API_KEY a tu archivo .env.local' 
        },
        { status: 500 }
      );
    }

    const prompt = `
    Eres un asistente de comunicación de la UNEFCO (Unidad de Especialización de Formación Continua).
    Genera un mensaje de invitación altamente atractivo y profesional para compartir por WhatsApp.
    Usa emojis de forma llamativa, negritas (formato WhatsApp con asteriscos, ej: *texto*) para destacar los puntos clave, y espaciado limpio.
    El mensaje debe convocar a los maestros al siguiente ciclo formativo con los siguientes detalles:

    - Ciclo Formativo: ${curso.ciclo_nombre || 'Sin nombre'}
    - Área Formativa: ${curso.area_formativa || curso.ciclo_grupo || 'Sin área'}
    - Cursos temáticos incluidos en el ciclo:
      ${curso.tema1 ? `* Curso 1: ${curso.tema1}` : ''}
      ${curso.tema2 ? `* Curso 2: ${curso.tema2}` : ''}
      ${curso.tema3 ? `* Curso 3: ${curso.tema3}` : ''}
      ${curso.tema4 ? `* Curso 4: ${curso.tema4}` : ''}
    - Facilitador(a): ${curso.facilitador_nombre || 'POR CONFIRMAR'}
    - Técnico de seguimiento: ${curso.tecnico_nombre || 'POR CONFIRMAR'}
    - Fecha y Hora de Inicio: ${curso.fecha_inicio || 'POR CONFIRMAR'}
    - Distrito Educativo: ${curso.distrito || 'Sin distrito'}
    - Lugar de realización: ${curso.lugar || 'POR CONFIRMAR'}
    - Costo de inversión: ${curso.costo || 50} Bs.
    - Enlace de Inscripción en Línea: ${linkInscripcion}

    Asegúrate de estructurar el mensaje con:
    1. Un título emocionante con emojis.
    2. Los detalles de los cursos, ciclo, distrito y área formativa ordenados y fáciles de leer.
    3. El enlace destacado de inscripción en línea.
    4. Un breve llamado a la acción motivador para el desarrollo profesional docente.

    Devuelve ÚNICAMENTE el texto listo para enviar por WhatsApp, sin formatos markdown adicionales, sin bloques de código, sin preámbulos.
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Error en la API de Gemini');
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('La IA no retornó ninguna respuesta');
    }

    return NextResponse.json({
      success: true,
      inviteText: text.trim()
    });

  } catch (error: any) {
    console.error('AI Generate Invite Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al generar la invitación con Inteligencia Artificial' },
      { status: 500 }
    );
  }
}
