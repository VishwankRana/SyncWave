import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  mongoUrl: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB ?? 'musicyfy',
  jwtSecret: process.env.JWT_SECRET ?? 'secret123',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
}
