import { serve } from "https://deno.land/std@0.201.0/http/server.ts"
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"

const SUPABASE_URL = Deno.env.get('POKEDLE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('POKEDLE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing POKEDLE_URL or POKEDLE_SERVICE_ROLE_KEY environment variables')
}

const supabaseAdmin = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '', { global: { fetch } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    const body = await req.json()
    const { result, guesses, anon_id } = body as { result?: any; guesses?: any[]; anon_id?: string }

    if (!result || !guesses) return json(400, { error: 'Missing `result` or `guesses` in request body' })
    if (!Array.isArray(guesses)) return json(400, { error: '`guesses` must be an array' })
    if (guesses.length > 5000) return json(400, { error: 'Too many guesses' })

    // Basic sanitization / size limits
    if (result.replay && JSON.stringify(result.replay).length > 50_000) delete result.replay

    // Attach anon_id if provided
    result.anon_id = anon_id ?? null

    // Call the server-side RPC to insert result + guesses atomically
    const { data, error } = await supabaseAdmin.rpc('insert_result_with_guesses', {
      result_row: result,
      guesses: guesses
    } as any)

    if (error) return json(500, { error: error.message })

    return json(200, { result_id: data })
  } catch (err: any) {
    return json(500, { error: err?.message ?? String(err) })
  }
})

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  })
}
