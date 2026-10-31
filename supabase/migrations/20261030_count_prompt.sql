-- 2026-10-30 : contrainte unique email (repare webhook Stripe, codes promo, compteur)
-- + fonction serveur count_prompt (compte un prompt ou retire un credit)
alter table public.users add constraint users_email_key unique (email);

create or replace function public.count_prompt(use_credit boolean default false)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  em text := auth.jwt() ->> 'email';
  r public.users;
begin
  if em is null then
    raise exception 'not authenticated';
  end if;
  insert into public.users (email) values (em) on conflict (email) do nothing;
  if use_credit then
    update public.users set prompt_credits = greatest(prompt_credits - 1, 0)
      where email = em and prompt_credits > 0 returning * into r;
  end if;
  if r.id is null then
    update public.users set prompts_used = prompts_used + 1
      where email = em returning * into r;
  end if;
  return json_build_object('prompts_used', r.prompts_used, 'prompt_credits', r.prompt_credits);
end;
$$;

revoke all on function public.count_prompt(boolean) from public, anon;
grant execute on function public.count_prompt(boolean) to authenticated;

revoke truncate, delete on public.users from anon, authenticated;
