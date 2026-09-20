import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    projectType: z.string(),
    status: z.enum(['Production', 'Active', 'Learning', 'Archived']),
    year: z.number(),
    featured: z.boolean(),
    order: z.number(),
    logo: z.string().optional(),
    technologies: z.record(z.string(), z.array(z.string())),
    competencies: z.array(z.string()),
    links: z
      .object({
        live: z.string().url().optional(),
        github: z.string().url().optional(),
        documentation: z.string().url().optional(),
      })
      .optional(),
    timeline: z
      .array(
        z.object({
          date: z.string(),
          event: z.string(),
        })
      )
      .optional(),
    metrics: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    recognition: z.array(z.string()).optional(),
  }),
});

export const collections = { projects };
