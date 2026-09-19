"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function Sidebar() {
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);

  const menu = [
    { nombre: "🏠 Dashboard", ruta: "/dashboard" },
    { nombre: "🌾 Marketplace", ruta: "/marketplace" },
    { nombre: "🤖 Oportunidades IA", ruta: "/oportunidades" },
    { nombre: "📢 Mis Publicaciones", ruta: "/mis-publicaciones" },
    { nombre: "📩 Ofertas recibidas", ruta: "/ofertas-recibidas" },
    { nombre: "🤝 Operaciones", ruta: "/operaciones" },
    { nombre: "💵 Comisiones", ruta: "/comisiones" },
    { nombre: "💸 Retiros de comisiones", ruta: "/retiros-comisiones" },
    { nombre: "💬 Mensajes", ruta: "/mensajes" },
    { nombre: "🔔 Notificaciones", ruta: "/notificaciones" },
    { nombre: "🏢 Empresas", ruta: "/empresas" },
    { nombre: "📄 Documentos", ruta: "/documentos" },
    { nombre: "⚙️ Configuración", ruta: "/configuracion" },
  ];

  useEffect(() => {
    let canalMensajes: ReturnType<typeof supabase.channel> | null = null;
    let canalNotificaciones: ReturnType<typeof supabase.channel> | null = null;

    async function cargarContadores() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMensajesNoLeidos(0);
        setNotificacionesNoLeidas(0);
        return;
      }

      const [
        { count: mensajesCount },
        { count: notificacionesCount },
      ] = await Promise.all([
        supabase
          .from("mensajes_comerciales")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("destinatario_profile_id", user.id)
          .is("leido_at", null),

        supabase
          .from("notificaciones")
          .select("id", {
            count: "exact",
            head: true,
          })
          .or(
            `profile_id.eq.${user.id},cuenta_id.eq.${user.id}`
          )
          .eq("leida", false),
      ]);

      setMensajesNoLeidos(mensajesCount || 0);
      setNotificacionesNoLeidas(notificacionesCount || 0);

      canalMensajes = supabase
        .channel(`sidebar-mensajes-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "mensajes_comerciales",
            filter: `destinatario_profile_id=eq.${user.id}`,
          },
          () => {
            setMensajesNoLeidos((actual) => actual + 1);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "mensajes_comerciales",
            filter: `destinatario_profile_id=eq.${user.id}`,
          },
          () => {
            cargarContadores();
          }
        )
        .subscribe();

      canalNotificaciones = supabase
        .channel(`sidebar-notificaciones-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notificaciones",
          },
          (payload) => {
            const nueva = payload.new as {
              profile_id?: string | null;
              cuenta_id?: string | null;
              leida?: boolean | null;
            };

            if (
              !nueva.leida &&
              (nueva.profile_id === user.id ||
                nueva.cuenta_id === user.id)
            ) {
              setNotificacionesNoLeidas(
                (actual) => actual + 1
              );
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notificaciones",
          },
          () => {
            cargarContadores();
          }
        )
        .subscribe();
    }

    cargarContadores();

    return () => {
      if (canalMensajes) {
        supabase.removeChannel(canalMensajes);
      }

      if (canalNotificaciones) {
        supabase.removeChannel(canalNotificaciones);
      }
    };
  }, []);

  return (
    <aside
      style={{
        width: "250px",
        background: "#1e293b",
        color: "white",
        padding: "20px",
        minHeight: "calc(100vh - 70px)",
      }}
    >
      <h3 style={{ marginBottom: "20px" }}>Menú</h3>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {menu.map((item) => {
          const esMensajes = item.ruta === "/mensajes";
          const esNotificaciones =
            item.ruta === "/notificaciones";

          const contador = esMensajes
            ? mensajesNoLeidos
            : esNotificaciones
              ? notificacionesNoLeidas
              : 0;

          return (
            <Link
              key={item.ruta}
              href={item.ruta}
              style={{
                color: "white",
                textDecoration: "none",
                padding: "10px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{item.nombre}</span>

              {contador > 0 && (
                <span
                  style={{
                    minWidth: 22,
                    height: 22,
                    padding: "0 6px",
                    borderRadius: 999,
                    background: "#dc2626",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {contador > 99 ? "99+" : contador}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
