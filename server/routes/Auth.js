import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { authenticate } from '../middleware/auth.js'
import { config } from '../config.js'

const router = Router()

const JWT_SECRET = config.jwtSecret

function normalizeEmail(email = '') {
  return email.trim().toLowerCase()
}

function serializeUser(user) {
  return {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
  }
}

function signToken(user) {
  return jwt.sign(serializeUser(user), JWT_SECRET, { expiresIn: '7d' })
}

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  const normalizedName = name?.trim()
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedName || !normalizedEmail || !password) {
    return res.status(400).json({ error: 'All fields required' })
  }

  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    return res.status(400).json({ error: 'User already exists' })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password: hashedPassword,
  })

  const token = signToken(user)

  res.json({ token, user: serializeUser(user) })
})

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const user = await User.findOne({ email: normalizedEmail })
  if (!user) {
    return res.status(400).json({ error: 'Invalid credentials' })
  }

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid credentials' })
  }

  const token = signToken(user)

  res.json({ token, user: serializeUser(user) })
})

router.get('/me', authenticate, async (req, res) => {
  const user = await User.findById(req.user.userId).select('_id name email')

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({ user: serializeUser(user) })
})

export default router
