-- RLS policies limit these write grants to platform administrators only.
grant insert,update,delete on table public.destinos_homologados to authenticated;
