import { Router } from 'express'
import { Room } from '../models/Room.js'

const router = Router()

/**
 * GET /api/rooms/public
 * Returns all rooms with at least basic info for discovery.
 * No auth required — anyone can browse.
 */
router.get('/public', async (_req, res) => {
  try {
    const rooms = await Room.find()
      .select('_id roomId roomName hostUserId members createdAtMs createdByName')
      .sort({ updatedAtMs: -1 })
      .limit(50)
      .lean()

    const publicRooms = rooms.map((room) => {
      const memberCount =
        room.members instanceof Map
          ? room.members.size
          : room.members
            ? Object.keys(room.members).length
            : 0

      return {
        roomId: room.roomId || room._id,
        roomName: room.roomName,
        hostUserId: room.hostUserId,
        listeners: memberCount,
        createdByName: room.createdByName,
        createdAtMs: room.createdAtMs,
      }
    })

    res.json({ ok: true, rooms: publicRooms })
  } catch (error) {
    console.error('Failed to fetch public rooms:', error)
    res.status(500).json({ error: 'Failed to fetch rooms' })
  }
})

export default router
