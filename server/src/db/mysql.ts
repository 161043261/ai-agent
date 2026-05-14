import knex, { type Knex } from "knex";
import { getConfig, logger } from "../config";

let db: Knex;

export async function initMysql(): Promise<void> {
  const cfg = getConfig().mysql;
  db = knex({
    client: "mysql2",
    connection: {
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.db,
      charset: cfg.charset,
    },
    pool: { min: 0, max: 100 },
  });

  await db.raw("SELECT 1");
  await createTables();
  logger.info("MySQL initialized");
}

async function createTables(): Promise<void> {
  if (!(await db.schema.hasTable("users"))) {
    await db.schema.createTable("users", (t) => {
      t.bigIncrements("id").primary();
      t.string("name", 64).defaultTo("");
      t.string("email", 128).defaultTo("").index();
      t.string("username", 64).notNullable().unique();
      t.string("password", 256).notNullable();
      t.timestamps(true, true);
      t.timestamp("deleted_at").nullable().defaultTo(null);
    });
  }

  if (!(await db.schema.hasTable("sessions"))) {
    await db.schema.createTable("sessions", (t) => {
      t.string("id", 64).primary();
      t.string("username", 64).notNullable().index();
      t.string("title", 128).defaultTo("");
      t.timestamps(true, true);
      t.timestamp("deleted_at").nullable().defaultTo(null);
    });
  }

  if (!(await db.schema.hasTable("messages"))) {
    await db.schema.createTable("messages", (t) => {
      t.increments("id").primary();
      t.string("session_id", 64).notNullable().index();
      t.string("username", 64).defaultTo("");
      t.text("content");
      t.boolean("is_user").notNullable();
      t.timestamp("created_at").defaultTo(db.fn.now());
    });
  }
}

export function getDb(): Knex {
  return db;
}
