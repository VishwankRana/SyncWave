import crypto from 'node:crypto'
import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'

// ────────────────────────────────────────────────
// In-memory invite store
// Map<code, { code, roomId, createdBy, expiresAt }>
// ────────────────────────────────────────────────
const invites = new Map()

const INVITE_TTL_MS = 60 * 60 * 1000 // 1 hour
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

/** Generate a URL-safe 6-character code */
function makeCode() {
  // 4 random bytes → base64url → trim to 6 chars
  return crypto.randomBytes(4).toString('base64url').slice(0, 6)
}

/** Remove expired invites */
function purgeExpired() {
  const now = Date.now()
  for (const [code, invite] of invites) {
    if (invite.expiresAt <= now) {
      invites.delete(code)
    }
  }
}

// Run cleanup periodically
setInterval(purgeExpired, CLEANUP_INTERVAL_MS)

// ────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────
const router = Router()

/**
 * POST /api/invites/generate
 * Auth required. Body: { roomId }
 * Returns: { code, inviteLink }
 */
router.post('/generate', authenticate, (req, res) => {
  const { roomId } = req.body

  if (!roomId || typeof roomId !== 'string') {
    return res.status(400).json({ error: 'roomId is required' })
  }

  // Generate a unique code (retry on collision, extremely unlikely)
  let code = makeCode()
  let attempts = 0
  while (invites.has(code) && attempts < 5) {
    code = makeCode()
    attempts++
  }

  const invite = {
    code,
    roomId,
    createdBy: req.user.userId,
    expiresAt: Date.now() + INVITE_TTL_MS,
  }

  invites.set(code, invite)

  // Build the full invite link using the Origin header or a fallback
  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'http://localhost:5173'
  const inviteLink = `${origin}/join/${code}`

  res.json({ code, inviteLink })
})

/**
 * GET /api/invites/:code
 * Public. Returns: { roomId } or 404/410
 */
router.get('/:code', (req, res) => {
  const { code } = req.params
  const invite = invites.get(code)

  if (!invite) {
    return res.status(404).json({ error: 'Invite not found' })
  }

  if (invite.expiresAt <= Date.now()) {
    invites.delete(code)
    return res.status(410).json({ error: 'Invite has expired' })
  }

  res.json({ roomId: invite.roomId })
})

export default router
