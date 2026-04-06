import { glob } from "astro/loaders"
import { defineCollection, z } from "astro:content"

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    overview: z.string().optional(),
    tags: z.array(z.string()),
    image: z.string().optional(),
    video: z.string().optional(),
    quote: z.string().optional(),
    citation: z.string().optional(),
    socialProof: z.array(z.string()).optional(),
    ctas: z
      .array(
        z.object({
          label: z.string(),
          href: z.string()
        })
      )
      .optional(),
    link: z.string().optional(),
    github: z.string().optional(),
    order: z.number().default(0)
  })
})

export const collections = { projects }
