
create table if not exists usuarios (
  id text primary key,
  nome text not null,
  email text unique not null,
  "senhaHash" text not null,
  endereco text not null,
  "tipoConta" text not null check ("tipoConta" in ('pf','empresa')),
  "nomeEmpresa" text not null default '',
  role text not null default 'user',
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists produtos (
  id text primary key,
  nome text not null,
  categoria text not null,
  "stockQty" integer not null default 0,
  "minStockQty" integer not null default 5,
  "unitPrice" numeric not null default 0,
  "isActive" boolean not null default true,
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  "updatedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists pedidos (
  id text primary key,
  "customerName" text not null,
  "deliveryAddress" text not null,
  "productId" text not null references produtos(id) on update cascade,
  quantity integer not null check (quantity > 0),
  priority text not null default 'media' check (priority in ('baixa','media','alta')),
  status text not null default 'confirmado' check (status in ('confirmado','em_andamento','entregue')),
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint,
  "deliveredAt" bigint null,
  "updatedAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists pedidos_createdat_idx on pedidos("createdAt" desc);

create table if not exists membros_equipe (
  id text primary key,
  nome text not null,
  funcao text not null,
  links text not null default '',
  "createdAt" bigint not null default (extract(epoch from now()) * 1000)::bigint
);