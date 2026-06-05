import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ci = searchParams.get('ci');

    if (!ci) {
      return NextResponse.json(
        { success: false, message: 'El parámetro CI es requerido' },
        { status: 400 }
      );
    }

    const sessionid = request.headers.get('x-sie-sessionid');
    const csrftoken = request.headers.get('x-sie-csrftoken');

    if (!sessionid || !csrftoken) {
      return NextResponse.json(
        { success: false, message: 'Sesión de SIE no iniciada o inválida' },
        { status: 401 }
      );
    }

    // Query the UNEFCO search portal
    const searchUrl = `https://sie.unefco.edu.bo/reports/search?cirda=${encodeURIComponent(ci)}`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        'Cookie': `sessionid=${sessionid}; csrftoken=${csrftoken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = await searchRes.text();

    // Check if the page redirected us to login (meaning session expired)
    if (html.includes('Iniciar Sesión') || html.includes('id_username') || searchRes.url.includes('/login')) {
      return NextResponse.json(
        { success: false, status: 'unauthorized', message: 'La sesión de SIE ha expirado. Por favor, vuelve a iniciar sesión.' },
        { status: 401 }
      );
    }

    // Parse participant rows from HTML
    const rows: any[] = [];
    const rowMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const rowHtml of rowMatches) {
      // Ignore header row (th elements)
      if (rowHtml.includes('<th') || rowHtml.includes('</th')) {
        continue;
      }

      // Find cells <td>
      const cellMatches = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (cellMatches && cellMatches.length >= 7) {
        const cleanText = (cell: string) => {
          return cell
            .replace(/<[^>]*>/g, '') // remove HTML tags
            .replace(/&nbsp;/g, ' ') // replace space entities
            .replace(/\s+/g, ' ') // normalise spaces
            .trim();
        };

        const idx = cleanText(cellMatches[0]);
        const rCI = cleanText(cellMatches[1]);
        const rRda = cleanText(cellMatches[2]);
        const rApellidos = cleanText(cellMatches[3]);
        const rNombres = cleanText(cellMatches[4]);
        const rCelular = cleanText(cellMatches[5]);
        const rEmail = cleanText(cellMatches[6]);

        // Validate that CI is a number
        if (rCI && !isNaN(Number(rCI.replace(/\D/g, '')))) {
          rows.push({
            ci: rCI,
            rda: rRda || null,
            apellidos: rApellidos.toUpperCase(),
            nombres: rNombres.toUpperCase(),
            celular: rCelular || null,
            email: rEmail || null
          });
        }
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        status: 'not_found',
        message: 'No se encontró ningún participante con esa C.I. en el portal SIE.'
      });
    }

    // Return the found participant(s)
    return NextResponse.json({
      success: true,
      status: 'found',
      data: rows
    });

  } catch (error: any) {
    console.error('SIE Search Backend Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error de conexión con el servidor SIE de UNEFCO' },
      { status: 500 }
    );
  }
}
