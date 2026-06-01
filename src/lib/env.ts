type DatabaseEnv = {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
};

type AdminAuthEnv = {
  email: string;
  password: string;
  authSecret: string;
};

export function hasDatabaseEnv() {
  return Boolean(
    process.env.DB_HOST &&
      process.env.DB_NAME &&
      process.env.DB_USER,
  );
}

export function getDatabaseEnv(): DatabaseEnv {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT ?? 3306);
  const name = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD ?? "";

  if (!host || !name || !user) {
    throw new Error(
      "Не заданы DB_HOST, DB_NAME или DB_USER. Создайте .env.local на основе .env.example.",
    );
  }

  return {
    host,
    port,
    name,
    user,
    password,
  };
}

export function hasAdminAuthEnv() {
  return Boolean(
    process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      process.env.AUTH_SECRET,
  );
}

export function getAdminAuthEnv(): AdminAuthEnv {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const authSecret = process.env.AUTH_SECRET;

  if (!email || !password || !authSecret) {
    throw new Error(
      "Не заданы ADMIN_EMAIL, ADMIN_PASSWORD или AUTH_SECRET. Добавьте их в .env.local.",
    );
  }

  return {
    email,
    password,
    authSecret,
  };
}