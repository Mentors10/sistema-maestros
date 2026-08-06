import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = body.username || 'gilmar.chavarria@unefco.edu.bo';
    const password = body.password || 'GILMAR.chavarria24#';

    const scriptPath = path.join(process.cwd(), 'scripts', 'sync_sie_monitoreo.js');
    
    const envOptions = {
      ...process.env,
      SIE_USERNAME: username,
      SIE_PASSWORD: password,
    };

    // Execute synchronization script
    const { stdout, stderr } = await execPromise(`node "${scriptPath}"`, {
      cwd: process.cwd(),
      env: envOptions,
      maxBuffer: 25 * 1024 * 1024,
    });

    console.log('SIE Sync Output:', stdout);
    if (stderr) console.warn('SIE Sync Stderr:', stderr);

    return NextResponse.json({
      success: true,
      message: '¡Datos del SIE UNEFCO sincronizados y actualizados en tiempo real!',
    });
  } catch (error: any) {
    console.error('Error al sincronizar datos del SIE:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al ejecutar la sincronización del SIE' },
      { status: 500 }
    );
  }
}
