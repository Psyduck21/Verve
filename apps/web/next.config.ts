import type { NextConfig } from "next"
import withBundleAnalyzer from "@next/bundle-analyzer"

const nextConfig: NextConfig = {
    transpilePackages: ["@verve/shared"],
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "ui-avatars.com" },
            { protocol: "https", hostname: "avatars.githubusercontent.com" },
            { protocol: "https", hostname: "lh3.googleusercontent.com" },
        ],
    },
}

// Enable bundle analyzer when ANALYZE=true is set
export default withBundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
})(nextConfig)
