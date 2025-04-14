// src/content/config.ts
import { defineCollection, z } from 'astro:content';

// Esquema para destinos
const destinationsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['nacional', 'internacional']),
    region: z.string(),
    price: z.number(),
    currency: z.enum(['COP', 'USD']).default('COP'),
    priceInUsd: z.boolean().default(false),
    originalPrice: z.number().nullable().optional(),
    duration: z.number(),
    durationText: z.string(),
    image: z.string(),
    gallery: z.array(z.string()).default([]),
    description: z.string(),
    featured: z.boolean().default(false),
    rating: z.number().min(0).max(100),
    availability: z.number(),
    tag: z.string(),
    includes: z.array(z.string()).default([]),
    notIncludes: z.array(z.string()).default([]),
    notes: z.string().optional(),
    // Añade estas nuevas propiedades
    experience: z.array(z.string()).optional().default([]),
    itinerary: z.array(z.object({
      day: z.union([z.string(), z.number()]).optional(),
      title: z.string(),
      activities: z.array(z.string()).optional()
    })).optional().default([]),
    requirements: z.array(z.string()).optional().default([])
  })
});


// Esquema para categorías
const categoriesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    image: z.string(),
    destinations: z.array(z.string()),
    url: z.string()
  })
});

// Esquema para alianzas
const alliancesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    fullName: z.string(),
    description: z.string(),
    logo: z.string(),
    benefits: z.array(z.string()),
    active: z.boolean().default(true)
  })
});

// Exporta las colecciones
export const collections = {
  destinations: destinationsCollection,
  categories: categoriesCollection,
  alliances: alliancesCollection
};