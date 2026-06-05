import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { fileData, mimeType } = await request.json();

    if (!fileData || !mimeType) {
      return NextResponse.json(
        { success: false, message: 'Faltan los datos del archivo o el tipo MIME' },
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

    // Prepare system prompt for participant extraction
    const prompt = `
    Analiza esta imagen o documento que contiene una nómina o lista de participantes (maestros/profesores) inscritos a un curso.
    Extrae a todos los participantes detectados de forma precisa en un formato JSON estructurado que sea exactamente un array de objetos con las siguientes propiedades:
    - ci (string, extraer solo los números de la cédula de identidad, omitir extensiones)
    - nombres (string, nombres en MAYÚSCULAS)
    - apellidos (string, apellidos en MAYÚSCULAS)
    - rda (string, opcional, número de RDA si existe, de lo contrario null)
    - celular (string, opcional, número de celular si existe, de lo contrario null)
    - sie (string, opcional, código SIE del colegio si existe, de lo contrario null)
    - unidad_educativa (string, opcional, nombre del colegio o unidad educativa en MAYÚSCULAS si existe, de lo contrario null)

    Asegúrate de procesar todos los registros visibles. Si el documento tiene marcas, tachaduras o notas hechas a mano, intenta descifrarlas.
    Devuelve ÚNICAMENTE el JSON estructurado en tu respuesta, sin código markdown, sin "json" al inicio, sin caracteres adicionales. Debe ser un array válido de JSON.
    `;

    // Clean base64 string if it contains data prefix
    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');

    // Call Gemini 1.5 Flash API
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
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: cleanBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
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

    // Parse extracted JSON from the model response
    let participants = [];
    try {
      participants = JSON.parse(text.trim());
      
      // Ensure the output is indeed an array
      if (!Array.isArray(participants)) {
        if (typeof participants === 'object' && participants !== null && ('participantes' in participants)) {
          participants = (participants as any).participantes;
        } else {
          participants = [participants];
        }
      }
    } catch (e) {
      console.error('Failed to parse Gemini response text:', text);
      throw new Error('La respuesta de la IA no pudo ser parseada como JSON válido: ' + text.substring(0, 100));
    }

    return NextResponse.json({
      success: true,
      data: participants
    });

  } catch (error: any) {
    console.error('AI Parse Nomina Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al procesar el archivo con Inteligencia Artificial' },
      { status: 500 }
    );
  }
}
