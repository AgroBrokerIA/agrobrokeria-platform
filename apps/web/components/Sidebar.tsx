"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MenuItem = { icon: string; key: string; fallback: string; ruta: string };

const menu: MenuItem[] = [
  { icon: "🏠", key: "nav.inicio", fallback: "Dashboard", ruta: "/dashboard" },
  { icon: "📊", key: "nav.mercado", fallback: "Mercado", ruta: "/mercado" },
  { icon: "🏷️", key: "nav.marketplace", fallback: "Marketplace", ruta: "/marketplace" },
  { icon: "➕", key: "nav.nueva_publicacion", fallback: "Nueva publicación", ruta: "/nueva-publicacion" },
  { icon: "📋", key: "nav.publicaciones", fallback: "Mis publicaciones", ruta: "/mis-publicaciones" },
  { icon: "📈", key: "nav.pizarra", fallback: "Pizarra", ruta: "/pizarra" },
  { icon: "🕘", key: "nav.historicos", fallback: "Históricos", ruta: "/pizarra" },
  { icon: "📉", key: "nav.futuros", fallback: "Futuros", ruta: "/mercado?tab=Futuros" },
  { icon: "🚢", key: "nav.fob", fallback: "FOB", ruta: "/mercado?tab=FOB" },
  { icon: "⚓", key: "nav.fas", fallback: "FAS", ruta: "/mercado?tab=FAS" },
  { icon: "🌎", key: "nav.cif", fallback: "CIF", ruta: "/mercado?tab=CIF" },
  { icon: "🤖", key: "nav.oportunidades", fallback: "Oportunidades IA", ruta: "/oportunidades" },
  { icon: "🧠", key: "nav.ia_matching", fallback: "IA Matching", ruta: "/oportunidades" },
  { icon: "🔎", key: "nav.buscar", fallback: "Buscar", ruta: "/buscar" },
  { icon: "📨", key: "nav.ofertas", fallback: "Ofertas recibidas", ruta: "/ofertas-recibidas" },
  { icon: "💬", key: "nav.mensajes", fallback: "Mensajes", ruta: "/mensajes" },
  { icon: "📹", key: "nav.videollamadas", fallback: "Videollamadas", ruta: "/videollamadas" },
  { icon: "📄", key: "nav.operaciones", fallback: "Operaciones", ruta: "/operaciones" },
  { icon: "📝", key: "nav.contratos", fallback: "Contratos", ruta: "/contratos" },
  { icon: "💰", key: "nav.facturacion", fallback: "Facturación", ruta: "/facturas" },
  { icon: "💳", key: "nav.pagos", fallback: "Pagos y cuentas", ruta: "/pagos" },
  { icon: "📁", key: "nav.documentos", fallback: "Documentación", ruta: "/documentos" },
  { icon: "🚢", key: "nav.logistica", fallback: "Logística", ruta: "/logistica" },
  { icon: "💼", key: "nav.comisiones", fallback: "Comisiones", ruta: "/comisiones" },
  { icon: "🏢", key: "nav.empresas", fallback: "Empresas", ruta: "/empresas" },
  { icon: "🔐", key: "nav.verificaciones", fallback: "Verificaciones", ruta: "/verificaciones" },
  { icon: "📊", key: "nav.reportes", fallback: "Reportes", ruta: "/reportes" },
  { icon: "🔔", key: "nav.notificaciones", fallback: "Notificaciones", ruta: "/notificaciones" },
  { icon: "👤", key: "nav.perfil", fallback: "Perfil", ruta: "/perfil" },
  { icon: "⚙️", key: "nav.administracion", fallback: "Administración", ruta: "/administracion" },
  { icon: "🛡️", key: "nav.seguridad", fallback: "Seguridad", ruta: "/seguridad" },
  { icon: "⚙️", key: "nav.configuracion", fallback: "Configuración", ruta: "/configuracion" },
  { icon: "❓", key: "nav.ayuda", fallback: "Ayuda", ruta: "/ayuda" },
];

const translations: Record<string, Record<string, string>> = {
  es: {}, en: {
    "nav.inicio":"Home","nav.mercado":"Market","nav.marketplace":"Marketplace","nav.nueva_publicacion":"New publication","nav.publicaciones":"My publications","nav.pizarra":"Market board","nav.oportunidades":"AI opportunities","nav.buscar":"Search","nav.ofertas":"Received offers","nav.mensajes":"Messages","nav.notificaciones":"Notifications","nav.videollamadas":"Video calls","nav.operaciones":"Operations","nav.contratos":"Contracts","nav.facturacion":"Invoicing","nav.pagos":"Payments & accounts","nav.cuentas_bancarias":"Bank accounts","nav.medios_cobro":"Collection methods","nav.documentos":"Documentation","nav.logistica":"Logistics","nav.comisiones":"Commissions","nav.retiros":"Commission withdrawals","nav.empresas":"Companies","nav.verificaciones":"Verifications","nav.seguridad":"Security","nav.reportes":"Reports","nav.perfil":"Profile","nav.historicos":"History","nav.futuros":"Futures","nav.fob":"FOB","nav.fas":"FAS","nav.cif":"CIF","nav.ia_matching":"AI Matching","nav.administracion":"Administration"
  }, pt: {
    "nav.inicio":"Início","nav.mercado":"Mercado","nav.marketplace":"Marketplace","nav.nueva_publicacion":"Nova publicação","nav.publicaciones":"Minhas publicações","nav.pizarra":"Quadro de preços","nav.oportunidades":"Oportunidades IA","nav.buscar":"Buscar","nav.ofertas":"Ofertas recebidas","nav.mensajes":"Mensagens","nav.notificaciones":"Notificações","nav.videollamadas":"Videochamadas","nav.operaciones":"Operações","nav.contratos":"Contratos","nav.facturacion":"Faturamento","nav.pagos":"Pagamentos e contas","nav.cuentas_bancarias":"Contas bancárias","nav.medios_cobro":"Meios de cobrança","nav.documentos":"Documentação","nav.logistica":"Logística","nav.comisiones":"Comissões","nav.retiros":"Saques de comissões","nav.empresas":"Empresas","nav.verificaciones":"Verificações","nav.seguridad":"Segurança","nav.reportes":"Relatórios","nav.perfil":"Perfil","nav.historicos":"Histórico","nav.futuros":"Futuros","nav.fob":"FOB","nav.fas":"FAS","nav.cif":"CIF","nav.ia_matching":"IA Matching","nav.administracion":"Administração"
  }, it: {
    "nav.inicio":"Home","nav.mercado":"Mercato","nav.marketplace":"Marketplace","nav.nueva_publicacion":"Nuova pubblicazione","nav.publicaciones":"Le mie pubblicazioni","nav.pizarra":"Listino di mercato","nav.oportunidades":"Opportunità IA","nav.buscar":"Cerca","nav.ofertas":"Offerte ricevute","nav.mensajes":"Messaggi","nav.notificaciones":"Notifiche","nav.videollamadas":"Videochiamate","nav.operaciones":"Operazioni","nav.contratos":"Contratti","nav.facturacion":"Fatturazione","nav.pagos":"Pagamenti e conti","nav.cuentas_bancarias":"Conti bancari","nav.medios_cobro":"Metodi di incasso","nav.documentos":"Documentazione","nav.logistica":"Logistica","nav.comisiones":"Commissioni","nav.retiros":"Prelievi commissioni","nav.empresas":"Aziende","nav.verificaciones":"Verifiche","nav.seguridad":"Sicurezza","nav.reportes":"Report","nav.perfil":"Profilo","nav.historicos":"Storico","nav.futuros":"Futures","nav.fob":"FOB","nav.fas":"FAS","nav.cif":"CIF","nav.ia_matching":"IA Matching","nav.administracion":"Amministrazione"
  }, fr: {
    "nav.inicio":"Accueil","nav.mercado":"Marché","nav.marketplace":"Marketplace","nav.nueva_publicacion":"Nouvelle publication","nav.publicaciones":"Mes publications","nav.pizarra":"Tableau du marché","nav.oportunidades":"Opportunités IA","nav.buscar":"Rechercher","nav.ofertas":"Offres reçues","nav.mensajes":"Messages","nav.notificaciones":"Notifications","nav.videollamadas":"Appels vidéo","nav.operaciones":"Opérations","nav.contratos":"Contrats","nav.facturacion":"Facturation","nav.pagos":"Paiements et comptes","nav.cuentas_bancarias":"Comptes bancaires","nav.medios_cobro":"Moyens d'encaissement","nav.documentos":"Documentation","nav.logistica":"Logistique","nav.comisiones":"Commissions","nav.retiros":"Retraits de commissions","nav.empresas":"Entreprises","nav.verificaciones":"Vérifications","nav.seguridad":"Sécurité","nav.reportes":"Rapports","nav.perfil":"Profil","nav.historicos":"Historique","nav.futuros":"Futures","nav.fob":"FOB","nav.fas":"FAS","nav.cif":"CIF","nav.ia_matching":"IA Matching","nav.administracion":"Administration"
  }, de: {
    "nav.inicio":"Startseite","nav.mercado":"Markt","nav.marketplace":"Marketplace","nav.nueva_publicacion":"Neue Veröffentlichung","nav.publicaciones":"Meine Veröffentlichungen","nav.pizarra":"Markttafel","nav.oportunidades":"KI-Chancen","nav.buscar":"Suchen","nav.ofertas":"Erhaltene Angebote","nav.mensajes":"Nachrichten","nav.notificaciones":"Benachrichtigungen","nav.videollamadas":"Videoanrufe","nav.operaciones":"Geschäfte","nav.contratos":"Verträge","nav.facturacion":"Abrechnung","nav.pagos":"Zahlungen & Konten","nav.cuentas_bancarias":"Bankkonten","nav.medios_cobro":"Zahlungswege","nav.documentos":"Dokumentation","nav.logistica":"Logistik","nav.comisiones":"Provisionen","nav.retiros":"Provisionsauszahlungen","nav.empresas":"Unternehmen","nav.verificaciones":"Verifizierungen","nav.seguridad":"Sicherheit","nav.reportes":"Berichte","nav.perfil":"Profil","nav.historicos":"Historie","nav.futuros":"Futures","nav.fob":"FOB","nav.fas":"FAS","nav.cif":"CIF","nav.ia_matching":"KI-Matching","nav.administracion":"Administration"
  }
};

export default function Sidebar() {
  const [lang, setLang] = useState("es");
  useEffect(() => {
    const saved = localStorage.getItem("agrobrokeria.language") || navigator.language?.split("-")[0] || "es";
    setLang(translations[saved] ? saved : "es");
  }, []);
  return <aside style={{width:260,background:"#111827",color:"white",minHeight:"100vh",padding:20,overflowY:"auto"}}>
    <h2 style={{marginBottom:30,color:"#22c55e"}}>AgroBroker IA</h2>
    {menu.map((item)=><Link key={item.key+":"+item.ruta} href={item.ruta} style={{display:"block",color:"white",textDecoration:"none",padding:"10px 0"}}><span aria-hidden="true">{item.icon}</span>{" "}{translations[lang][item.key] || item.fallback}</Link>)}
  </aside>;
}
