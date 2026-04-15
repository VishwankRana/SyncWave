import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT),
  corsOrigin: process.env.CORS_ORIGIN,
  jwtSecret: process.env.JWT_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  mongoUrl: process.env.MONGODB_URI
}
