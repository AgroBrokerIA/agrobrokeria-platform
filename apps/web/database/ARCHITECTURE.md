# AgroBroker IA - Arquitectura del Sistema

## Objetivo

AgroBroker IA es una plataforma B2B para la comercialización nacional e internacional de commodities agrícolas.

La plataforma conecta:

- Compradores
- Vendedores
- Corredores
- Exportadores
- Acopios
- Industrias
- Empresas logísticas

utilizando Inteligencia Artificial para detectar oportunidades comerciales.

---

# Módulos

## Autenticación

- Login
- Registro
- Recuperar contraseña
- Verificación de empresa
- Roles
- Permisos

---

## Empresas

Cada empresa tendrá:

- Razón social
- Nombre comercial
- CUIT
- IVA
- País
- Provincia
- Ciudad
- Dirección
- Sitio web
- Email
- Teléfono
- Logo
- Descripción
- Estado

---

## Marketplace

Una empresa podrá publicar:

- Compra
- Venta

Cada publicación contendrá:

- Producto
- Cantidad
- Unidad
- Precio
- Moneda
- Incoterm
- Puerto
- Calidad
- Campaña
- Vigencia
- Observaciones
- Fotos
- Documentos

---

## Operaciones

Cuando dos empresas llegan a un acuerdo se genera una operación.

Una operación tendrá:

- Comprador
- Vendedor
- Producto
- Cantidad
- Precio
- Estado
- Documentación
- Comisiones

---

## Mensajería

Los usuarios podrán conversar sin revelar sus datos personales hasta que la operación avance.

---

## Inteligencia Artificial

La IA podrá:

- Detectar coincidencias
- Recomendar compradores
- Recomendar vendedores
- Analizar precios
- Detectar oportunidades
- Generar documentos comerciales

---

## Logística

- Transportistas
- Puertos
- Fletes
- Seguimiento
- Costos

---

## Administración

- Usuarios
- Empresas
- Productos
- Operaciones
- Reportes
- Auditoría

---

# Modelo General

auth.users

↓

profiles

↓

company_users

↓

companies

↓

offers

↓

operations

↓

documents

↓

messages

↓

notifications

---

# Objetivo Final

Crear la plataforma B2B más completa para la comercialización de commodities agrícolas de Latinoamérica.