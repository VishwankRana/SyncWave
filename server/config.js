import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  mongoUrl: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
  mongoDbName: process.env.MONGODB_DB ?? 'musicyfy',
  jwtSecret: process.env.JWT_SECRET ?? 'secret123',
}
