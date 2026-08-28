-- =====================================================
-- AgroBroker IA
-- 001_schema.sql
-- Base de Datos Principal
-- =====================================================

-- =====================================
-- EXTENSIONS
-- =====================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =====================================
-- ENUMS
-- =====================================

create type user_role as enum (
    'comprador',
    'vendedor',
    'corredor',
    'exportador',
    'acopio',
    'industria',
    'administrador'
);

create type company_status as enum (
    'pendiente',
    'verificada',
    'rechazada',
    'suspendida'
);

create type offer_type as enum (
    'compra',
    'venta'
);

create type offer_status as enum (
    'borrador',
    'publicada',
    'cerrada',
    'cancelada'
);

create type operation_status as enum (
    'negociacion',
    'confirmada',
    'en_proceso',
    'finalizada',
    'cancelada'
);

-- =====================================
-- PROFILES
-- =====================================

create table if not exists profiles (

    id uuid primary key references auth.users(id) on delete cascade,

    nombre text not null,

    email text unique not null,

    telefono text,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);
-- =====================================
-- COMPANIES
-- =====================================

create table if not exists companies (

    id uuid primary key default gen_random_uuid(),

    razon_social text not null,

    nombre_comercial text,

    cuit text unique not null,

    email text,

    telefono text,

    pais text default 'Argentina',

    provincia text,

    ciudad text,

    direccion text,

    sitio_web text,

    descripcion text,

    logo text,

    estado company_status default 'pendiente',

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);
-- =====================================
-- COMPANY USERS
-- =====================================

create table if not exists company_users (

    id uuid primary key default gen_random_uuid(),

    company_id uuid not null
        references companies(id)
        on delete cascade,

    profile_id uuid not null
        references profiles(id)
        on delete cascade,

    rol user_role not null default 'comprador',

    activo boolean default true,

    created_at timestamptz default now(),

    unique(company_id, profile_id)

);
-- =====================================
-- PRODUCTS
-- =====================================

create table if not exists products (

    id uuid primary key default gen_random_uuid(),

    nombre text not null,

    categoria text,

    unidad text default 'TN',

    activo boolean default true,

    created_at timestamptz default now()

);
-- =====================================
-- OFFERS
-- =====================================

create table if not exists offers (

    id uuid primary key default gen_random_uuid(),

    company_id uuid not null
        references companies(id)
        on delete cascade,

    product_id uuid not null
        references products(id),

    tipo offer_type not null,

    estado offer_status default 'borrador',

    cantidad numeric(18,3) not null,

    unidad text default 'TN',

    precio numeric(18,2),

    moneda text default 'USD',

    incoterm text,

    puerto text,

    calidad text,

    campaña text,

    observaciones text,

    fecha_publicacion timestamptz default now(),

    fecha_vencimiento timestamptz,

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);
-- =====================================
-- OFFER IMAGES
-- =====================================

create table if not exists offer_images (

    id uuid primary key default gen_random_uuid(),

    offer_id uuid not null
        references offers(id)
        on delete cascade,

    url text not null,

    principal boolean default false,

    created_at timestamptz default now()

);
-- =====================================
-- OFFER DOCUMENTS
-- =====================================

create table if not exists offer_documents (

    id uuid primary key default gen_random_uuid(),

    offer_id uuid not null
        references offers(id)
        on delete cascade,

    nombre text not null,

    url text not null,

    tipo text,

    created_at timestamptz default now()

);
-- =====================================
-- OPERATIONS
-- =====================================

create table if not exists operations (

    id uuid primary key default gen_random_uuid(),

    offer_id uuid not null
        references offers(id),

    comprador_company_id uuid
        references companies(id),

    vendedor_company_id uuid
        references companies(id),

    cantidad numeric(18,3),

    precio numeric(18,2),

    moneda text default 'USD',

    estado operation_status default 'negociacion',

    fecha_operacion timestamptz default now(),

    created_at timestamptz default now(),

    updated_at timestamptz default now()

);