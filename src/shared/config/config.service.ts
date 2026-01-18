import * as dotenv from 'dotenv';
import Joi, { ObjectSchema, ValidationResult } from '@hapi/joi';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface EnvConfig {
  [key: string]: string;
}

export class ConfigService {
  private readonly env: EnvConfig;
  private static instance: ConfigService | null = null;

  constructor(filePath: string) {
    const resolvedPath = join(process.cwd(), filePath || '.env');
    const fileConfig = existsSync(resolvedPath)
      ? dotenv.parse(readFileSync(resolvedPath))
      : {};
    const mergedConfig: EnvConfig = {
      ...fileConfig,
      ...process.env,
    } as unknown as EnvConfig;
    this.env = this.validateInput(mergedConfig);
  }

  static getInstance(): ConfigService {
    if (this.instance == null) {
      this.instance = new ConfigService(`${process.env.NODE_ENV || ''}.env`);
    }

    return this.instance;
  }

  getString(key: string): string {
    return this.env[key];
  }

  getNumber(key: string): number {
    return parseFloat(this.env[key]);
  }

  getBoolean(key: string): boolean {
    const value = this.env[key];

    switch (typeof value) {
      case 'boolean':
        return value;
      case 'number':
        return value !== 0;
      case 'string':
        return value.toLowerCase() === 'true';
      default:
        return false;
    }
  }

  getList(key: string, delimiter = ','): string[] {
    const value = this.env[key];

    if (!value) {
      return [];
    }

    return String(value)
      .split(delimiter)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  hasKey(key: string): boolean {
    return this.env[key] !== undefined;
  }

  /**
   * Ensures all needed variables are set, and returns the validated JavaScript object
   * including the applied default values.
   */
  private validateInput(env: EnvConfig): EnvConfig {
    const envVarsSchema: ObjectSchema<EnvConfig> = Joi.object<EnvConfig>({
      APP_ENV: Joi.string()
        .valid('local', 'development', 'production', 'test')
        .default('local'),
      APP_PORT: Joi.number().default(4000),
      DB_CONNECTION: Joi.string().required(),
      DB_HOST: Joi.string().required(),
      DB_PORT: Joi.number().default(5432),
      DB_USERNAME: Joi.string().required(),
      DB_PASSWORD: Joi.string().required(),
      DB_DATABASE: Joi.string().required(),
      DB_MIGRATIONS: Joi.string().default('dist/**/migrations/*.js'),
      DB_ENTITIES: Joi.string().default('dist/**/*.entity.js'),
      DB_SUBSCRIBERS: Joi.string().default('dist/**/subscribers/**.js'),
      DB_LOGGING: Joi.boolean().default(false),
      DB_SYNCHRONIZE: Joi.boolean().default(false),
      DB_SSL_CA: Joi.string().default(''),
      REDIS_HOST: Joi.string().required(),
      REDIS_PORT: Joi.number().default(6379),
      REDIS_PASSWORD: Joi.string().allow('').optional(),
      COURIER_SERVICE_URL: Joi.string().default('http://localhost:4000/mocks'),
      SHOPIFY_ADMIN_SERVICE_URL: Joi.string().default(
        'http://localhost:4000/mocks',
      ),
      SHOPIFY_ADMIN_NOTIFICATIONS_RATE_MAX: Joi.number().default(2),
      SHOPIFY_ADMIN_NOTIFICATIONS_RATE_DURATION_MS: Joi.number().default(1000),
      QUEUE_DEFAULT_ATTEMPTS: Joi.number().default(3),
      QUEUE_DEFAULT_BACKOFF_MS: Joi.number().default(5000),
      QUEUE_DEFAULT_BACKOFF_TYPE: Joi.string()
        .valid('fixed', 'exponential')
        .default('exponential'),
    });

    const { error, value: validatedEnvConfig }: ValidationResult =
      envVarsSchema.validate(env, {
        allowUnknown: true,
      });

    if (error) {
      throw new Error(`Config validation error: ${error.message}`);
    }

    return validatedEnvConfig as EnvConfig;
  }
}

const config = ConfigService.getInstance();

export { config };
