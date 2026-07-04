import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://sarang.dev", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://sarang.dev/projects", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: "https://sarang.dev/blog", lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: "https://sarang.dev/privacy", lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: "https://sarang.dev/visitors", lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ];
}
