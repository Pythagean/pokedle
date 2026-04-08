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

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url)
      const pokledleNumber = parseInt(url.searchParams.get('pokedle_number') ?? '', 10)
      const groupCode = url.searchParams.get('group_code') ?? ''

      if (!pokledleNumber || isNaN(pokledleNumber)) return json(400, { error: 'Missing or invalid pokedle_number' })
      if (groupCode && !/^\d+(-\d+)*$/.test(groupCode)) return json(400, { error: 'Invalid group_code' })

      let query = supabaseAdmin
        .from('results')
        .select('player, classic, card, pokedex, details, colours, locations, total')
        .eq('pokedle_number', pokledleNumber)

      if (groupCode) {
        query = query.eq('group_code', groupCode)
      }

      const { data, error } = await query.order('total', { ascending: true }).limit(50)

      if (error) return json(500, { error: error.message })
      return json(200, { results: data ?? [] })
    } catch (err: any) {
      return json(500, { error: err?.message ?? String(err) })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = await req.json()
      const { result_id, player, group_code } = body as { result_id?: number; player?: string; group_code?: string }

      if (!result_id || typeof result_id !== 'number') return json(400, { error: 'Missing or invalid result_id' })

      const updates: Record<string, unknown> = {}
      if (player !== undefined) {
        if (typeof player !== 'string' || player.length > 50) return json(400, { error: 'Invalid player name' })
        updates.player = player.trim().slice(0, 12) || null
      }
      if (group_code !== undefined) {
        if (typeof group_code !== 'string' || group_code.length > 50) return json(400, { error: 'Invalid group_code' })
        if (!/^\d+(-\d+)*$/.test(group_code)) return json(400, { error: 'Invalid group_code format' })
        updates.group_code = group_code
      }

      if (Object.keys(updates).length === 0) return json(400, { error: 'No fields to update' })

      const { error } = await supabaseAdmin.from('results').update(updates).eq('id', result_id)
      if (error) return json(500, { error: error.message })
      return json(200, { ok: true })
    } catch (err: any) {
      return json(500, { error: err?.message ?? String(err) })
    }
  }

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

    // Hash the client IP server-side for abuse detection (never stored raw)
    try {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('cf-connecting-ip')
        || req.headers.get('x-real-ip')
        || null
      if (ip) {
        const encoded = new TextEncoder().encode(ip)
        const hashBuf = await crypto.subtle.digest('SHA-256', encoded)
        result.ip_hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
      }
    } catch (_) {
      // non-critical — leave ip_hash null if hashing fails
    }

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  })
}
