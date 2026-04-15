import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { User } from '../models/User.js'
import { config } from '../config.js'

const router = Router()

const JWT_SECRET = config.jwtSecret

function serializeUser(user) {
  return {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
  }
}

function signToken(user) {
  return jwt.sign(serializeUser(user), JWT_SECRET, { expiresIn: '7d' })
}

/**
 * POST /api/auth/google
 * Body: { credential } — the Google ID token from the client-side sign-in
 *
 * Verifies the Google ID token, creates or updates the user, returns a JWT.
 */
router.post('/google', async (req, res) => {
  const { credential } = req.body

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' })
  }

  const clientId = config.googleClientId

  if (!clientId) {
    return res.status(500).json({ error: 'Google OAuth is not configured on this server' })
  }

  try {
    const client = new OAuth2Client(clientId)

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    })

    const payload = ticket.getPayload()

    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token' })
    }

    const { sub: googleId, email, name, picture } = payload

    // Find existing user by googleId or email
    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    })

    if (user) {
      // Update Google fields if they changed
      if (!user.googleId) user.googleId = googleId
      if (picture && user.avatar !== picture) user.avatar = picture
      if (name && user.name !== name) user.name = name
      await user.save()
    } else {
      // Create new user
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        avatar: picture || null,
      })
    }

    const token = signToken(user)
    res.json({ token, user: serializeUser(user) })
  } catch (error) {
    console.error('Google OAuth error:', error.message)
    res.status(401).json({ error: 'Google authentication failed' })
  }
})

export default router
