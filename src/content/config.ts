// 1. Import utilities from `astro:content`
import { z, defineCollection, reference } from "astro:content";

// 2. Define a `type` and `schema` for each collection
const blogCollection = defineCollection({
    type: "content",
    schema: z.object({
        isDraft: z.boolean().default(true),
        title: z.string(),
        image: z.object({
          url: z.string(),
          alt: z.string(),
        }),
        author: z.string().default('Anonymous'),
        description: z.string().default('No description'),
        tags: z.array(z.string().default('blog')),
        // An optional frontmatter property. Very common!
        // In frontmatter, dates written without quotes around them are interpreted as Date objects
        publishDate: z.date(),
        // You can also transform a date string (e.g. "2022-07-08") to a Date object
        // publishDate: z.string().transform((str) => new Date(str)),
        // Advanced: Validate that the string is also an email
        authorContact: z.string().email().default('NULL'),
        relatedPosts: z.array(reference('posts')).optional(),
  })
})

// 3. Export a single `collections` object to register your collection(s)
export const collections = {
  'posts': blogCollection,
};