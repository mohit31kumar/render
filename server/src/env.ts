import dotenv from 'dotenv'

dotenv.config()

export const env = {
  port: Number(process.env.PORT ?? 3001),
  renderApiKey: process.env.RENDER_API_KEY ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
}
