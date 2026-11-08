create table if not exists public.padron_lookup_rate_limits(
 ip_hash text primary key,
 window_started_at timestamptz not null default now(),
 request_count integer not null default 0 check(request_count>=0),
 updated_at timestamptz not null default now()
);
alter table public.padron_lookup_rate_limits enable row level security;
revoke all on public.padron_lookup_rate_limits from public,anon,authenticated;
create or replace function public.permitir_consulta_padron(p_ip_hash text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.padron_lookup_rate_limits%rowtype;
begin
 if p_ip_hash is null or length(p_ip_hash)<32 or length(p_ip_hash)>128 then return false; end if;
 insert into public.padron_lookup_rate_limits(ip_hash,window_started_at,request_count,updated_at)
 values(p_ip_hash,now(),1,now()) on conflict(ip_hash) do nothing;
 select * into v from public.padron_lookup_rate_limits where ip_hash=p_ip_hash for update;
 if v.window_started_at<now()-interval '1 hour' then
  update public.padron_lookup_rate_limits set window_started_at=now(),request_count=1,updated_at=now() where ip_hash=p_ip_hash;
  return true;
 end if;
 if v.request_count>=10 then return false; end if;
 update public.padron_lookup_rate_limits set request_count=request_count+1,updated_at=now() where ip_hash=p_ip_hash;
 return true;
end $$;
revoke all on function public.permitir_consulta_padron(text) from public,anon,authenticated;
grant execute on function public.permitir_consulta_padron(text) to service_role;
