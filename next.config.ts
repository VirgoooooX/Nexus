import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "@prisma/client/extension", "@prisma/adapter-better-sqlite3", "better-sqlite3"],
};

export default nextConfig;
