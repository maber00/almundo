// src/content/config.ts
import { defineCollection, z } from 'astro:content';

// Esquema para destinos
const destinationsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['nacional', 'internacional', 'crucero']), // Añadido 'crucero'
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
    tags: z.array(z.string()).optional().default([]),
    includes: z.array(z.string()).default([]),
    notIncludes: z.array(z.string()).default([]),
    notes: z.string().optional(),
    // Propiedades adicionales
    experience: z.array(z.string()).optional().default([]),
    itinerary: z.array(z.object({
      day: z.union([z.string(), z.number()]).optional(),
      title: z.string(),
      activities: z.array(z.string()).optional()
    })).optional().default([]),
    requirements: z.array(z.string()).optional().default([]),
    // Propiedades específicas para cruceros
    cruiseLine: z.string().optional(),
    ship: z.string().optional(),
    ports: z.array(z.string()).optional().default([])
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

// Esquema para categorías de destino (NUEVA COLECCIÓN)
const destinationCategoriesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    image: z.string(),
    url: z.string(),
    buttonText: z.string().optional().default("Ver todos"),
    order: z.number().default(0),
    active: z.boolean().default(true)
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

const cruiseRoutesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    image: z.string(),
    duration: z.string(),
    active: z.boolean().default(true),
    order: z.number().default(0)
  })
});


// Esquema para slides del hero
const heroSlidesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    image: z.string(),
    offerText: z.string(),
    buttonText: z.string().default("Ver oferta"),
    buttonUrl: z.string(),
    order: z.number().default(0),
    active: z.boolean().default(true)
  })
});

// Esquema para blog
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    date: z.string(),
    author: z.string(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    featuredImage: z.string(),
    featured: z.boolean().default(false),
    published: z.boolean().default(true)
  })
});
const financingPartnersCollection = defineCollection({
  type: 'content',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    logo: z.string(),
    interestRate: z.string().default("0%"),
    installmentOptions: z.array(z.string()).default(["3", "6", "12"]),
    requirementsText: z.string().optional(),
    requirements: z.array(z.string()).default([]),
    active: z.boolean().default(true),
    order: z.number().default(0)
  })
});


// Exportamos todas las colecciones
export const collections = {
  destinations: destinationsCollection,
  categories: categoriesCollection,
  'destination-categories': destinationCategoriesCollection,
  'cruise-routes': cruiseRoutesCollection, // Aquí está el error
  'financing-partners': financingPartnersCollection, // Agregamos la nueva colección
  alliances: alliancesCollection,
  'hero-slides': heroSlidesCollection,
  blog: blogCollection
};