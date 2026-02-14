import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '0');

    const supabase = createServerClient();

    let query = supabase
      .from('ideas')
      .select('*, narratives!inner(id, title, slug, confidence_score, signal_count, source_diversity, status, tags)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (hours > 0) {
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      query = query.gte('created_at', since);
    }

    const { data: ideas, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: ideas || [],
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { data: [], error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
