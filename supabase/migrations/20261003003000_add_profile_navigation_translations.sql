insert into public.traducciones_ui (clave, idioma, texto, version)
select k.clave,k.idioma,k.texto,1
from (values
('nav.perfil','es','Perfil'),('nav.perfil','en','Profile'),('nav.perfil','pt','Perfil'),('nav.perfil','it','Profilo'),('nav.perfil','fr','Profil'),('nav.perfil','de','Profil')
) k(clave,idioma,texto)
where not exists (select 1 from public.traducciones_ui t where t.clave=k.clave and t.idioma=k.idioma and t.version=1);