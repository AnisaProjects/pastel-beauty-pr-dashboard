import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer (Stage 3 PDF export) relies on react-reconciler
  // internals that Next.js's Server Components bundler can break when it
  // pulls the package through the RSC graph (a documented incompatibility,
  // see diegomura/react-pdf#2350). Marking it external makes Next.js
  // require() it via native Node resolution instead, sidestepping the issue.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
