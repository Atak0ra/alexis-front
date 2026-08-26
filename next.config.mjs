/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SERVER_API_URL: process.env.SERVER_API_URL,
    IS_DEMO: process.env.IS_DEMO,
  },
};
export default nextConfig;
