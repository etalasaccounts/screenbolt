/** @type {import('next').NextConfig} */
const nextConfig = {
  // API configuration for large file uploads
  serverExternalPackages: [],
  // Increase body size limits for video uploads
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "screenbolt.b-cdn.net",
        port: "",
      },
      {
        protocol: "https",
        hostname: "storage.bunnycdn.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "video.bunnycdn.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "*.b-cdn.net",
        port: "",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        port: "",
      },
    ],
  },
};

module.exports = nextConfig;
