import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/workspace/",
        "/drone",
        "/documentation/drone-platform",
        "/executive-overview",
        "/login",
      ],
    },
  };
}
