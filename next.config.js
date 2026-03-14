/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: ".next_docker",
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
};

module.exports = nextConfig;
