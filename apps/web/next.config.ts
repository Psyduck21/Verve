import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    transpilePackages: ["@verve/shared"],
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "ui-avatars.com" },
            { protocol: "https", hostname: "avatars.githubusercontent.com" },
            { protocol: "https", hostname: "lh3.googleusercontent.com" },
        ],
    }
}

export default nextConfig
