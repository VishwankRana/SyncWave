import jwt from 'jsonwebtoken'
import { config } from '../config.js'

const JWT_SECRET = config.jwtSecret

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    console.log('Auth header missing')
    return res.status(401).json({ error: 'No token' })
  }

  const token = authHeader.split(' ')[1]
  console.log('Received token:', token ? `${token.substring(0, 20)}...` : 'undefined')

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    console.log('Token verified successfully for user:', decoded.userId)
    req.user = decoded
    next()
  } catch (error) {
    console.error('Token verification failed:', error.message)
    res.status(401).json({ error: 'Invalid token', reason: error.message })
  }
}