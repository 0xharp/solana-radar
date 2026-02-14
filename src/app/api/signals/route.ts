import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const strength = searchParams.get('strength');
    const hours = parseInt(searchParams.get('hours') || '0');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const supabase = createServerClient();

    let query = supabase
      .from('signals')
      .select('*', { count: 'exact' })
      .order('composite_score', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (source) query = query.eq('source', source);
    if (strength) query = query.eq('strength', strength);
    if (hours > 0) {
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      query = query.gte('created_at', since);
    }

    const { data: signals, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: signals || [],
      total: count || 0,
      page,
      pageSize,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { data: [], total: 0, page: 1, pageSize: 50, error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
