import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Migración inicial para Postgres (Neon) escrita a mano, equivalente a la de
// SQLite (src/migrations/20261119_190020_initial.ts): mismas colecciones y
// mismos índices, traducidos al DDL que genera el adaptador de Postgres de
// Payload 3.94 (ids `serial`, timestamps `timestamp(3) with time zone`,
// campos select como tipos ENUM `enum_<tabla>_<campo>`, JSON como `jsonb`).
// El CLI `payload migrate:create` no corre en Node 24 (bug de undici /
// CacheStorage, igual que `generate:importmap`).
// Se verifica contra un Postgres local antes del despliegue; la migración de
// SQLite queda intacta y se sigue usando cuando DATABASE_URI es `file:...`.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_users_role" AS ENUM('Paciente', 'Recepción', 'Profesional', 'Coordinación', 'TI');
  `);
  await db.execute(sql`
    CREATE TYPE "public"."enum_appointments_status" AS ENUM('programada', 'confirmada', 'atendida', 'no presentada', 'cancelada');
  `);
  await db.execute(sql`
    CREATE TYPE "public"."enum_schedule_blocks_reason" AS ENUM('Capacitación', 'Ausencia', 'Indisponibilidad');
  `);
  await db.execute(sql`
    CREATE TYPE "public"."enum_audit_log_result" AS ENUM('Exitoso', 'Rechazado');
  `);
  // OJO: `users` va ANTES que `users_sessions` porque esta última tiene una
  // FK a `users`; Postgres exige que la tabla referenciada ya exista (en
  // SQLite el orden no importaba).
  await db.execute(sql`
    CREATE TABLE "users" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"username" text NOT NULL,
    	"name" text NOT NULL,
    	"role" "public"."enum_users_role" DEFAULT 'Paciente' NOT NULL,
    	"matricula" text,
    	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    	"email" text NOT NULL,
    	"reset_password_token" text,
    	"reset_password_expiration" timestamp(3) with time zone,
    	"salt" text,
    	"hash" text,
    	"reset_password_requested_at" timestamp(3) with time zone,
    	"login_attempts" numeric DEFAULT 0,
    	"lock_until" timestamp(3) with time zone
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX "users_username_idx" ON "users" ("username");
  `);
  await db.execute(sql`
    CREATE INDEX "users_updated_at_idx" ON "users" ("updated_at");
  `);
  await db.execute(sql`
    CREATE INDEX "users_created_at_idx" ON "users" ("created_at");
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX "users_email_idx" ON "users" ("email");
  `);
  await db.execute(sql`
    CREATE TABLE "users_sessions" (
    	"_order" integer NOT NULL,
    	"_parent_id" integer NOT NULL,
    	"id" text PRIMARY KEY NOT NULL,
    	"created_at" timestamp(3) with time zone,
    	"expires_at" timestamp(3) with time zone NOT NULL,
    	FOREIGN KEY ("_parent_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
    );
  `);
  await db.execute(sql`
    CREATE INDEX "users_sessions_order_idx" ON "users_sessions" ("_order");
  `);
  await db.execute(sql`
    CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" ("_parent_id");
  `);
  await db.execute(sql`
    CREATE TABLE "appointments" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"folio" text NOT NULL,
    	"patient_name" text NOT NULL,
    	"patient_id" text NOT NULL,
    	"contact" text,
    	"user_type" text,
    	"professional" text NOT NULL,
    	"service" text NOT NULL,
    	"date" text NOT NULL,
    	"start_time" text NOT NULL,
    	"end_time" text NOT NULL,
    	"room" text,
    	"status" "public"."enum_appointments_status" DEFAULT 'programada' NOT NULL,
    	"channel" text,
    	"created_by" text,
    	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX "appointments_folio_idx" ON "appointments" ("folio");
  `);
  await db.execute(sql`
    CREATE INDEX "appointments_updated_at_idx" ON "appointments" ("updated_at");
  `);
  await db.execute(sql`
    CREATE INDEX "appointments_created_at_idx" ON "appointments" ("created_at");
  `);
  await db.execute(sql`
    CREATE TABLE "schedule_blocks" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"professional" text NOT NULL,
    	"start_date" text NOT NULL,
    	"end_date" text NOT NULL,
    	"start_time" text NOT NULL,
    	"end_time" text NOT NULL,
    	"reason" "public"."enum_schedule_blocks_reason" NOT NULL,
    	"detail" text,
    	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE INDEX "schedule_blocks_updated_at_idx" ON "schedule_blocks" ("updated_at");
  `);
  await db.execute(sql`
    CREATE INDEX "schedule_blocks_created_at_idx" ON "schedule_blocks" ("created_at");
  `);
  await db.execute(sql`
    CREATE TABLE "audit_log" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"actor" text NOT NULL,
    	"actor_role" text,
    	"action" text NOT NULL,
    	"target" text,
    	"result" "public"."enum_audit_log_result",
    	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" ("updated_at");
  `);
  await db.execute(sql`
    CREATE INDEX "audit_log_created_at_idx" ON "audit_log" ("created_at");
  `);
  await db.execute(sql`
    CREATE TABLE "payload_kv" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"key" text NOT NULL,
    	"data" jsonb NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" ("key");
  `);
  await db.execute(sql`
    CREATE TABLE "payload_locked_documents" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"global_slug" text,
    	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" ("global_slug");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" ("updated_at");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" ("created_at");
  `);
  await db.execute(sql`
    CREATE TABLE "payload_locked_documents_rels" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"order" integer,
    	"parent_id" integer NOT NULL,
    	"path" text NOT NULL,
    	"users_id" integer,
    	"appointments_id" integer,
    	"schedule_blocks_id" integer,
    	"audit_log_id" integer,
    	FOREIGN KEY ("parent_id") REFERENCES "payload_locked_documents"("id") ON UPDATE no action ON DELETE cascade,
    	FOREIGN KEY ("users_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade,
    	FOREIGN KEY ("appointments_id") REFERENCES "appointments"("id") ON UPDATE no action ON DELETE cascade,
    	FOREIGN KEY ("schedule_blocks_id") REFERENCES "schedule_blocks"("id") ON UPDATE no action ON DELETE cascade,
    	FOREIGN KEY ("audit_log_id") REFERENCES "audit_log"("id") ON UPDATE no action ON DELETE cascade
    );
  `);
  await db.execute(sql`
    CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" ("order");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" ("parent_id");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" ("path");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" ("users_id");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_locked_documents_rels_appointments_id_idx" ON "payload_locked_documents_rels" ("appointments_id");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_locked_documents_rels_schedule_blocks_id_idx" ON "payload_locked_documents_rels" ("schedule_blocks_id");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" ("audit_log_id");
  `);
  await db.execute(sql`
    CREATE TABLE "payload_preferences" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"key" text,
    	"value" text,
    	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" ("key");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" ("updated_at");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" ("created_at");
  `);
  await db.execute(sql`
    CREATE TABLE "payload_preferences_rels" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"order" integer,
    	"parent_id" integer NOT NULL,
    	"path" text NOT NULL,
    	"users_id" integer,
    	FOREIGN KEY ("parent_id") REFERENCES "payload_preferences"("id") ON UPDATE no action ON DELETE cascade,
    	FOREIGN KEY ("users_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
    );
  `);
  await db.execute(sql`
    CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" ("order");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" ("parent_id");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" ("path");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" ("users_id");
  `);
  await db.execute(sql`
    CREATE TABLE "payload_migrations" (
    	"id" serial PRIMARY KEY NOT NULL,
    	"name" text,
    	"batch" numeric,
    	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `);
  await db.execute(sql`
    CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" ("updated_at");
  `);
  await db.execute(sql`
    CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" ("created_at");
  `);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "payload_migrations";
  `);
  await db.execute(sql`
    DROP TABLE "payload_preferences_rels";
  `);
  await db.execute(sql`
    DROP TABLE "payload_preferences";
  `);
  await db.execute(sql`
    DROP TABLE "payload_locked_documents_rels";
  `);
  await db.execute(sql`
    DROP TABLE "payload_locked_documents";
  `);
  await db.execute(sql`
    DROP TABLE "payload_kv";
  `);
  await db.execute(sql`
    DROP TABLE "audit_log";
  `);
  await db.execute(sql`
    DROP TABLE "schedule_blocks";
  `);
  await db.execute(sql`
    DROP TABLE "appointments";
  `);
  await db.execute(sql`
    DROP TABLE "users_sessions";
  `);
  await db.execute(sql`
    DROP TABLE "users";
  `);
  await db.execute(sql`
    DROP TYPE "public"."enum_audit_log_result";
  `);
  await db.execute(sql`
    DROP TYPE "public"."enum_schedule_blocks_reason";
  `);
  await db.execute(sql`
    DROP TYPE "public"."enum_appointments_status";
  `);
  await db.execute(sql`
    DROP TYPE "public"."enum_users_role";
  `);
}
