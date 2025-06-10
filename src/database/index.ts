import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema";

const sqlite = new Database("data/qotd.db");
export const db = drizzle(sqlite, { schema });

// Initialize database
export function initializeDatabase() {
	try {
		migrate(db, { migrationsFolder: "drizzle" });
		console.log("Database initialized successfully");
	}
	catch (error) {
		console.error("Failed to initialize database:", error);
	}
}