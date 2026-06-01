import "server-only";

import mysql from "mysql2/promise";

import { getDatabaseEnv } from "@/lib/env";

declare global {
  var __fpbMysqlPool: mysql.Pool | undefined;
}

export function getDbPool() {
  if (!global.__fpbMysqlPool) {
    const env = getDatabaseEnv();

    global.__fpbMysqlPool = mysql.createPool({
      host: env.host,
      port: env.port,
      database: env.name,
      user: env.user,
      password: env.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
    });
  }

  return global.__fpbMysqlPool;
}