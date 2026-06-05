import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Usuario y contraseña requeridos' },
        { status: 400 }
      );
    }

    // 1. GET request to obtain the initial CSRF cookie and CSRF middleware token
    const getRes = await fetch('https://sie.unefco.edu.bo/login', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const getHtml = await getRes.text();
    
    // Extract csrfmiddlewaretoken value from HTML using regex
    const csrfTokenMatch = getHtml.match(/name="csrfmiddlewaretoken"\s+value="([^"]+)"/);
    const csrfmiddlewaretoken = csrfTokenMatch ? csrfTokenMatch[1] : '';

    // Extract csrftoken cookie from Set-Cookie headers
    const setCookies = getRes.headers.getSetCookie();
    let csrftokenCookie = '';
    for (const cookie of setCookies) {
      const match = cookie.match(/csrftoken=([^;]+)/);
      if (match) {
        csrftokenCookie = match[1];
        break;
      }
    }

    if (!csrfmiddlewaretoken || !csrftokenCookie) {
      return NextResponse.json(
        { success: false, message: 'No se pudo establecer conexión segura con el portal SIE (Falta token CSRF)' },
        { status: 500 }
      );
    }

    // 2. POST request to submit login credentials
    const bodyParams = new URLSearchParams();
    bodyParams.append('csrfmiddlewaretoken', csrfmiddlewaretoken);
    bodyParams.append('username', username);
    bodyParams.append('password', password);

    const postRes = await fetch('https://sie.unefco.edu.bo/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `csrftoken=${csrftokenCookie}`,
        'Referer': 'https://sie.unefco.edu.bo/login',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: bodyParams.toString(),
      redirect: 'manual' // Prevent auto-redirect to capture redirects and cookies manually
    });

    // Extract cookies from the POST response
    const postSetCookies = postRes.headers.getSetCookie();
    let sessionid = '';
    let newCsrftoken = csrftokenCookie;

    for (const cookie of postSetCookies) {
      const sessionMatch = cookie.match(/sessionid=([^;]+)/);
      if (sessionMatch) {
        sessionid = sessionMatch[1];
      }
      const csrfMatch = cookie.match(/csrftoken=([^;]+)/);
      if (csrfMatch) {
        newCsrftoken = csrfMatch[1];
      }
    }

    // Django sets a sessionid cookie on successful login
    if (!sessionid) {
      return NextResponse.json(
        { success: false, message: 'Credenciales inválidas. Verifica tu nombre de usuario y contraseña en el portal SIE.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      cookies: {
        sessionid,
        csrftoken: newCsrftoken
      }
    });

  } catch (error: any) {
    console.error('SIE Login Backend Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error de conexión con el servidor SIE de UNEFCO' },
      { status: 500 }
    );
  }
}
