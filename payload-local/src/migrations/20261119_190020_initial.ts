import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Migración inicial generada a mano (el CLI `payload migrate:create` no corre
// en Node 24 por el bug de undici/CacheStorage). El SQL es el esquema exacto
// que Payload generó en desarrollo (volcado de medinex.db).
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`
    CREATE TABLE "users_sessions" (
    	"_order" integer NOT NULL,
    	"_parent_id" integer NOT NULL,
    	"id" text PRIMARY KEY NOT NULL,
    	"created_at" text,
    	"expires_at" text NOT NULL,
    	FOREIGN KEY ("_parent_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
    );
  `);
  await db.run(sql`
    CREATE INDEX "users_sessions_order_idx" ON "users_sessions" ("_order");
  `);
  await db.run(sql`
    CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" ("_parent_id");
  `);
  await db.run(sql`
    CREATE TABLE "users" (
    	"id" integer PRIMARY KEY NOT NULL,
    	"username" text NOT NULL,
    	"name" text NOT NULL,
    	"role" text DEFAULT 'Paciente' NOT NULL,
    	"matricula" text,
    	"updated_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    	"created_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    	"email" text NOT NULL,
    	"reset_password_token" text,
    	"reset_password_expiration" text,
    	"salt" text,
    	"hash" text,
    	"reset_password_requested_at" text,
    	"login_attempts" numeric DEFAULT 0,
    	"lock_until" text
    );
  `);
  await db.run(sql`
    CREATE UNIQUE INDEX "users_username_idx" ON "users" ("username");
  `);
  await db.run(sql`
    CREATE INDEX "users_updated_at_idx" ON "users" ("updated_at");
  `);
  await db.run(sql`
    CREATE INDEX "users_created_at_idx" ON "users" ("created_at");
  `);
  await db.run(sql`
    CREATE UNIQUE INDEX "users_email_idx" ON "users" ("email");
  `);
  await db.run(sql`
    CREATE TABLE "appointments" (
    	"id" integer PRIMARY KEY NOT NULL,
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
    	"status" text DEFAULT 'programada' NOT NULL,
    	"channel" text,
    	"created_by" text,
    	"updated_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    	"created_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
    );
  `);
  await db.run(sql`
    CREATE UNIQUE INDEX "appointments_folio_idx" ON "appointments" ("folio");
  `);
  await db.run(sql`
    CREATE INDEX "appointments_updated_at_idx" ON "appointments" ("updated_at");
  `);
  await db.run(sql`
    CREATE INDEX "appointments_created_at_idx" ON "appointments" ("created_at");
  `);
  await db.run(sql`
    CREATE TABLE "schedule_blocks" (
    	"id" integer PRIMARY KEY NOT NULL,
    	"professional" text NOT NULL,
    	"start_date" text NOT NULL,
    	"end_date" text NOT NULL,
    	"start_time" text NOT NULL,
    	"end_time" text NOT NULL,
    	"reason" text NOT NULL,
    	"detail" text,
    	"updated_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    	"created_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
    );
  `);
  await db.run(sql`
    CREATE INDEX "schedule_blocks_updated_at_idx" ON "schedule_blocks" ("updated_at");
  `);
  await db.run(sql`
    CREATE INDEX "schedule_blocks_created_at_idx" ON "schedule_blocks" ("created_at");
  `);
  await db.run(sql`
    CREATE TABLE "audit_log" (
    	"id" integer PRIMARY KEY NOT NULL,
    	"actor" text NOT NULL,
    	"actor_role" text,
    	"action" text NOT NULL,
    	"target" text,
    	"result" text,
    	"created_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    	"updated_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
    );
  `);
  await db.run(sql`
    CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" ("updated_at");
  `);
  await db.run(sql`
    CREATE INDEX "audit_log_created_at_idx" ON "audit_log" ("created_at");
  `);
  await db.run(sql`
    CREATE TABLE "payload_kv" (
    	"id" integer PRIMARY KEY NOT NULL,
    	"key" text NOT NULL,
    	"data" text NOT NULL
    );
  `);
  await db.run(sql`
    CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" ("key");
  `);
  await db.run(sql`
    CREATE TABLE "payload_locked_documents" (
    	"id" integer PRIMARY KEY NOT NULL,
    	"global_slug" text,
    	"updated_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    	"created_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
    );
  `);
  await db.run(sql`
    CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" ("global_slug");
  `);
  await db.run(sql`
    CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" ("updated_at");
  `);
  await db.run(sql`
    CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" ("created_at");
  `);
  await db.run(sql`
    CREATE TABLE "payload_locked_documents_rels" (
    	"id" integer PRIMARY KEY NOT NULL,
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
  await db.run(sql`
    CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" ("order");
  `);
  await db.run(sql`
    CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" ("parent_id");
  `);
  await db.run(sql`
    CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" ("path");
  `);
  await db.run(sql`
    CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" ("users_id");
  `);
  await db.run(sql`
    CREATE INDEX "payload_locked_documents_rels_appointments_id_idx" ON "payload_locked_documents_rels" ("appointments_id");
  `);
  await db.run(sql`
    CREATE INDEX "payload_locked_documents_rels_schedule_blocks_id_idx" ON "payload_locked_documents_rels" ("schedule_blocks_id");
  `);
  await db.run(sql`
    CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" ("audit_log_id");
  `);
  await db.run(sql`
    CREATE TABLE "payload_preferences" (
    	"id" integer PRIMARY KEY NOT NULL,
    	"key" text,
    	"value" text,
    	"updated_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    	"created_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
    );
  `);
  await db.run(sql`
    CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" ("key");
  `);
  await db.run(sql`
    CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" ("updated_at");
  `);
  await db.run(sql`
    CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" ("created_at");
  `);
  await db.run(sql`
    CREATE TABLE "payload_preferences_rels" (
    	"id" integer PRIMARY KEY NOT NULL,
    	"order" integer,
    	"parent_id" integer NOT NULL,
    	"path" text NOT NULL,
    	"users_id" integer,
    	FOREIGN KEY ("parent_id") REFERENCES "payload_preferences"("id") ON UPDATE no action ON DELETE cascade,
    	FOREIGN KEY ("users_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
    );
  `);
  await db.run(sql`
    CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" ("order");
  `);
  await db.run(sql`
    CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" ("parent_id");
  `);
  await db.run(sql`
    CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" ("path");
  `);
  await db.run(sql`
    CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" ("users_id");
  `);
  await db.run(sql`
    CREATE TABLE "payload_migrations" (
    	"id" integer PRIMARY KEY NOT NULL,
    	"name" text,
    	"batch" numeric,
    	"updated_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    	"created_at" text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
    );
  `);
  await db.run(sql`
    CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" ("updated_at");
  `);
  await db.run(sql`
    CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" ("created_at");
  `);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`
    DROP TABLE "payload_migrations";
  `);
  await db.run(sql`
    DROP TABLE "payload_preferences_rels";
  `);
  await db.run(sql`
    DROP TABLE "payload_preferences";
  `);
  await db.run(sql`
    DROP TABLE "payload_locked_documents_rels";
  `);
  await db.run(sql`
    DROP TABLE "payload_locked_documents";
  `);
  await db.run(sql`
    DROP TABLE "payload_kv";
  `);
  await db.run(sql`
    DROP TABLE "audit_log";
  `);
  await db.run(sql`
    DROP TABLE "schedule_blocks";
  `);
  await db.run(sql`
    DROP TABLE "appointments";
  `);
  await db.run(sql`
    DROP TABLE "users";
  `);
  await db.run(sql`
    DROP TABLE "users_sessions";
  `);
}
