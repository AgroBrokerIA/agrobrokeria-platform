-- Ensure the core currency catalog exists in every environment.
insert into public.monedas (codigo, nombre, simbolo)
values
  ('ARS', 'Peso argentino', '$'),
  ('USD', 'Dólar estadounidense', 'US$'),
  ('EUR', 'Euro', '€'),
  ('BRL', 'Real brasileño', 'R$')
on conflict (codigo) do update
set nombre = excluded.nombre,
    simbolo = excluded.simbolo;
