import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    transpilePackages: ["@verve/shared"],
    images: {
        dangerouslyAllowSVG: true,
        remotePatterns: [
            { protocol: "https", hostname: "ui-avatars.com" },
            { protocol: "https", hostname: "avatars.githubusercontent.com" },
            { protocol: "https", hostname: "lh3.googleusercontent.com" },
        ],
    },
    async redirects() {
        return [
            {
                source: '/analytics',
                destination: '/calendar', // Analytics merged/removed
                permanent: true,
            }
        ]
    }
}

export default nextConfig
