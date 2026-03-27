import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('users')
    .select('id, username, coins')
    .order('coins', { ascending: false })
    .limit(20);

  return NextResponse.json(data ?? []);
}
