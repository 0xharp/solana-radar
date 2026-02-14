import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Delete in order to respect foreign keys
    await supabase.from('ideas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('narrative_signals').delete().neq('narrative_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('narratives').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('signals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('metric_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('collection_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    return NextResponse.json({ status: 'cleaned', timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
