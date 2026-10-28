import { defineRailway, github, project, service, volume } from "railway/iac";

/** The demos project holds other services too, so this file manages only its own slice. */
export const partial = "bun-fullstack-base";

/**
 * The service: Railway builds it with Railpack (Bun, from package.json), then runs Void's server from dist/. SQLite
 * lives on the volume, at DATABASE_PATH. One replica, as SQLite serializes writers, so more wouldn't help. Railway
 * mounts volumes as root, so RAILWAY_RUN_UID=0 runs the app as root, to write /data.
 */
export default defineRailway(() => {
  const data = volume("bun-fullstack-base-data", {
    region: "us-west2",
    sizeMB: 1024,
  });

  const app = service("bun-fullstack-base", {
    source: github("esauflores/bun-fullstack-base", { branch: "main" }),
    build: "bun run build",
    start: "bun run start",
    healthcheck: "/api/health",
    replicas: 1,
    volumeMounts: {
      "/data": data,
    },
    env: {
      DATABASE_PATH: "/data/app.db",
      RAILWAY_RUN_UID: "0",
    },
  });

  return project("demos", {
    resources: [app, data],
  });
});
