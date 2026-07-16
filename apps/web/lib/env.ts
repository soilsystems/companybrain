import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:8000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_DEFAULT_BUSINESS_ID: z.string().uuid().optional(),
  NEXT_PUBLIC_DEFAULT_DOMAIN_ID: z.string().uuid().optional(),
});

export const env = clientEnvSchema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  NEXT_PUBLIC_DEFAULT_BUSINESS_ID:
    process.env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID || undefined,
  NEXT_PUBLIC_DEFAULT_DOMAIN_ID:
    process.env.NEXT_PUBLIC_DEFAULT_DOMAIN_ID || undefined,
});
