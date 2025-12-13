import { NextRequest, NextResponse } from 'next/server';
import { fetchAccessToken } from 'hume';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.HUME_API_KEY;
    const secretKey = process.env.HUME_SECRET_KEY;

    if (!apiKey || !secretKey) {
      console.error('Missing HUME_API_KEY or HUME_SECRET_KEY');
      return NextResponse.json(
        { error: 'API keys not configured' },
        { status: 500 }
      );
    }

    const accessToken = await fetchAccessToken({
      apiKey,
      secretKey,
    });

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to fetch access token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error('Error fetching access token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
