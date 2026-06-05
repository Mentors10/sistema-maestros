import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mapUrl = searchParams.get('url');

  if (!mapUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    // If it is a short link
    if (mapUrl.includes('maps.app.goo.gl') || mapUrl.includes('goo.gl/maps') || mapUrl.includes('goo.gl')) {
      const response = await fetch(mapUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const finalUrl = response.url;

      // Extract place name
      let placeName = '';
      const placeMatch = finalUrl.match(/\/maps\/place\/([^/]+)/);
      if (placeMatch) {
        placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      }

      // Extract coordinates from !3d/!4d parameters (most accurate for place pin)
      const pinMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (pinMatch) {
        const lat = pinMatch[1];
        const lon = pinMatch[2];
        const embedSrc = `https://maps.google.com/maps?q=${lat},${lon}${placeName ? `(${encodeURIComponent(placeName)})` : ''}&output=embed`;
        return NextResponse.json({ embedSrc, longUrl: finalUrl });
      }

      // Extract coordinates from @lat,lon parameters
      const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        const lat = atMatch[1];
        const lon = atMatch[2];
        const embedSrc = `https://maps.google.com/maps?q=${lat},${lon}${placeName ? `(${encodeURIComponent(placeName)})` : ''}&output=embed`;
        return NextResponse.json({ embedSrc, longUrl: finalUrl });
      }

      // Fallback if we only have place name
      if (placeName) {
        const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&output=embed`;
        return NextResponse.json({ embedSrc, longUrl: finalUrl });
      }

      // Final fallback
      return NextResponse.json({ embedSrc: `https://maps.google.com/maps?q=${encodeURIComponent(finalUrl)}&output=embed`, longUrl: finalUrl });
    }

    // If it's already a long URL or coordinates, parse it directly
    let placeName = '';
    const placeMatch = mapUrl.match(/\/maps\/place\/([^/]+)/);
    if (placeMatch) {
      placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }

    const pinMatch = mapUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (pinMatch) {
      const lat = pinMatch[1];
      const lon = pinMatch[2];
      const embedSrc = `https://maps.google.com/maps?q=${lat},${lon}${placeName ? `(${encodeURIComponent(placeName)})` : ''}&output=embed`;
      return NextResponse.json({ embedSrc });
    }

    const atMatch = mapUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      const lat = atMatch[1];
      const lon = atMatch[2];
      const embedSrc = `https://maps.google.com/maps?q=${lat},${lon}${placeName ? `(${encodeURIComponent(placeName)})` : ''}&output=embed`;
      return NextResponse.json({ embedSrc });
    }

    return NextResponse.json({ embedSrc: `https://maps.google.com/maps?q=${encodeURIComponent(mapUrl)}&output=embed` });
  } catch (error: any) {
    console.error('Error resolving map URL:', error);
    return NextResponse.json({ error: 'Failed to resolve map URL', details: error.message }, { status: 500 });
  }
}
