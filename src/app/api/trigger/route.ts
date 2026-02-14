import { NextResponse } from 'next/server';

export const maxDuration = 300;

// Proxy endpoint to trigger pipeline jobs from the UI.
// Internally calls /api/cron/run or /api/cron/analyze with the CRON_SECRET
// so the frontend doesn't need to know the secret.

export async function POST(request: Request) {
  try {
    const { job } = await request.json() as { job: 'collect' | 'analyze' };

    if (!job || !['collect', 'analyze'].includes(job)) {
      return NextResponse.json({ error: 'Invalid job. Use "collect" or "analyze".' }, { status: 400 });
    }

    const cronSecret = process.env.CRON_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const endpoint = job === 'collect' ? '/api/cron/run' : '/api/cron/analyze';

    const res = await fetch(`${appUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
