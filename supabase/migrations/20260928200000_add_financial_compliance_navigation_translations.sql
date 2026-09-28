insert into public.traducciones_ui (clave, idioma, texto, version)
select v.clave, v.idioma, v.texto, 1
from (values
  ('nav.transacciones','es','Transacciones'),('nav.transacciones','en','Transactions'),('nav.transacciones','pt','Transações'),('nav.transacciones','it','Transazioni'),('nav.transacciones','fr','Transactions'),('nav.transacciones','de','Transaktionen'),
  ('nav.cuentas_bancarias','es','Cuentas bancarias'),('nav.cuentas_bancarias','en','Bank accounts'),('nav.cuentas_bancarias','pt','Contas bancárias'),('nav.cuentas_bancarias','it','Conti bancari'),('nav.cuentas_bancarias','fr','Comptes bancaires'),('nav.cuentas_bancarias','de','Bankkonten'),
  ('nav.cumplimientos','es','Cumplimientos'),('nav.cumplimientos','en','Compliance'),('nav.cumplimientos','pt','Conformidade'),('nav.cumplimientos','it','Conformità'),('nav.cumplimientos','fr','Conformité'),('nav.cumplimientos','de','Konformität')
) as v(clave, idioma, texto)
on conflict (clave, idioma, version) do update set texto = excluded.texto;