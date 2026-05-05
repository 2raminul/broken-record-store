import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  MONGO_URL: Joi.string().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  MUSICBRAINZ_BASE_URL: Joi.string().default('https://musicbrainz.org/ws/2'),
  MUSICBRAINZ_USER_AGENT: Joi.string().required(),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
});
