create or replace function public.insert_result_with_guesses(
  result_row jsonb,
  guesses jsonb
) returns bigint language plpgsql security definer as $$
declare
  new_result_id bigint;
  g jsonb;
  existing_id bigint;
begin
  -- Check if a result already exists for this pokedle_number + anon_id
  select id into existing_id from public.results
  where pokedle_number = (result_row->>'pokedle_number')::bigint
    and anon_id = (result_row->>'anon_id')::uuid
  limit 1;

  if existing_id is not null then
    -- Update existing result
    update public.results set
      player = coalesce(result_row->>'player', player),
      classic = (result_row->>'classic')::bigint,
      card = (result_row->>'card')::bigint,
      pokedex = (result_row->>'pokedex')::bigint,
      details = (result_row->>'details')::bigint,
      colours = (result_row->>'colours')::bigint,
      locations = (result_row->>'locations')::bigint,
      total = (result_row->>'total')::bigint,
      client_version = result_row->>'client_version',
      device_info = result_row->'device_info',
      ip_hash = result_row->>'ip_hash',
      validated = coalesce((result_row->>'validated')::boolean, validated),
      replay = result_row->'replay',
      mode = result_row->>'mode',
      group_code = result_row->>'group_code',
      updated_at = now()
    where id = existing_id;
    
    -- Delete old guesses for this result
    delete from public.guesses where result_id = existing_id;
    
    new_result_id := existing_id;
  else
    -- Insert new result
    insert into public.results(
      pokedle_number, player, classic, card, pokedex, details, colours, locations, total,
      user_id, anon_id, client_version, device_info, ip_hash, validated, replay, mode, group_code
    )
    values (
      (result_row->>'pokedle_number')::bigint,
      result_row->>'player',
      (result_row->>'classic')::bigint,
      (result_row->>'card')::bigint,
      (result_row->>'pokedex')::bigint,
      (result_row->>'details')::bigint,
      (result_row->>'colours')::bigint,
      (result_row->>'locations')::bigint,
      (result_row->>'total')::bigint,
      (result_row->>'user_id')::uuid,
      (result_row->>'anon_id')::uuid,
      result_row->>'client_version',
      result_row->'device_info',
      result_row->>'ip_hash',
      coalesce((result_row->>'validated')::boolean, false),
      result_row->'replay',
      result_row->>'mode',
      result_row->>'group_code'
    )
    returning id into new_result_id;
  end if;

  -- Insert guesses
  for g in select * from jsonb_array_elements(guesses) loop
    insert into public.guesses(result_id, mode, guess, guess_number, correct)
    values (
      new_result_id,
      (g->>'mode'),
      (g->>'guess')::bigint,
      (g->>'guess_number')::int,
      (g->>'correct')::boolean
    );
  end loop;

  return new_result_id;
end;
$$;