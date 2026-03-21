create or replace function public.insert_result_with_guesses(
  result_row jsonb,
  guesses jsonb
) returns bigint language plpgsql security definer as $$
declare
  new_result_id bigint;
  g jsonb;
begin
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