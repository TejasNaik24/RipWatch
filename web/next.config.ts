import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Screens are screen-recorded for the judging video; keep the dev badge out of frame.
  // Compile and runtime errors still show.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
