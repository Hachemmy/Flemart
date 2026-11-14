import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().optional(),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().min(1),
    DB_PASSWORD: z.string().optional().default(''),
    DB_NAME: z.string().min(1),
    DB_NAME_TEST: z.string().optional(),
    DB_SSL: z.enum(['true', 'false']).default('false'),
    FRONTEND_URL: z.string().url(),
    BACKEND_URL: z.string().url().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    MODEL_PROVIDER_URL: z.string().url().optional(),
    MODEL_NAME: z.string().optional(),
    API_KEY: z.string().optional(),
    TRUST_PROXY: z.enum(['true', 'false']).default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('[env] Invalid environment configuration:');
    for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
}

export const env = parsed.data;
export const JWT_SECRET = env.JWT_SECRET;
export const isProduction = env.NODE_ENV === 'production';
