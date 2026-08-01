import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'reporte_diario_template.html');
    if (fs.existsSync(filePath)) {
      const html = fs.readFileSync(filePath, 'utf8');
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
    return new NextResponse('<h1>Reporte Diario no disponible</h1>', { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.html || typeof body.html !== 'string') {
      return NextResponse.json({ error: 'Contenido HTML no válido' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'reporte_diario_template.html');
    fs.writeFileSync(filePath, body.html, 'utf8');

    return NextResponse.json({ success: true, message: 'Plantilla de Reporte Diario actualizada exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
