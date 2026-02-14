import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();

    const [
      { count: signalCount },
      { count: narrativeCount },
      { data: lastRun },
    ] = await Promise.all([
      supabase.from('signals').select('*', { count: 'exact', head: true }),
      supabase.from('narratives').select('*', { count: 'exact', head: true }),
      supabase.from('collection_runs')
        .select('completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    return NextResponse.json({
      status: 'healthy',
      lastCollection: lastRun?.completed_at || null,
      signalCount: signalCount || 0,
      narrativeCount: narrativeCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'degraded',
      lastCollection: null,
      signalCount: 0,
      narrativeCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
