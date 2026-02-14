import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: narrative, error } = await supabase
      .from('narratives')
      .select('*, ideas(*), narrative_signals(signal_id, relevance_score, signals(*))')
      .eq('id', id)
      .single();

    if (error || !narrative) {
      return NextResponse.json({ error: 'Narrative not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: narrative,
      error: null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
