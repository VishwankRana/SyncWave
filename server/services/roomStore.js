import { Room } from '../models/Room.js'
import { createEmptyRoomState } from '../../shared/contracts.js'

/**
 * Mongoose Map fields are not JSON-serializable over Socket.IO.
 * Convert the `members` Map to a plain object so clients receive it correctly.
 */
function toPlainState(room) {
  const obj = room.toObject()

  if (obj.members instanceof Map) {
    const plain = {}
    for (const [key, value] of obj.members) {
      plain[key] = value
    }
    obj.members = plain
  }

  return obj
}

// ================= ROOM EXISTS =================
export async function roomExists(roomId) {
  const room = await Room.findById(roomId).select('_id')
  return !!room
}

// ================= CREATE ROOM =================
export async function createRoom(roomId, metadata = {}) {
  const exists = await Room.findById(roomId)
  if (exists) return null

  const newRoom = new Room({
    _id: roomId,
    roomId,
    ...createEmptyRoomState(roomId, metadata.hostUserId),
    ...metadata,
    createdAtMs: Date.now(),
  })

  await newRoom.save()
  return toPlainState(newRoom)
}

// ================= GET ROOM =================
export async function getRoomState(roomId) {
  const room = await Room.findById(roomId)

  if (!room) {
    return createEmptyRoomState(roomId)
  }

  return toPlainState(room)
}

// ================= SAVE ROOM =================
export async function saveRoomState(roomId, state) {
  state.updatedAtMs = Date.now()

  const updated = await Room.findByIdAndUpdate(
    roomId,
    { $set: state },
    { new: true, upsert: true }
  )

  return toPlainState(updated)
}

// ================= ADD MEMBER =================
export async function addMember(roomId, member) {
  const room = await Room.findById(roomId)

  room.members.set(member.id, member)
  room.updatedAtMs = Date.now()

  await room.save()
  return toPlainState(room)
}

// ================= REMOVE MEMBER =================
export async function removeMember(roomId, memberId) {
  const room = await Room.findById(roomId)

  if (!room) {
    return null
  }

  room.members.delete(memberId)
  room.updatedAtMs = Date.now()

  await room.save()
  return toPlainState(room)
}

// ================= CHAT =================
export async function appendChatMessage(roomId, message) {
  const room = await Room.findById(roomId)

  room.chat.push(message)
  room.chat = room.chat.slice(-100)
  room.updatedAtMs = Date.now()

  await room.save()
  return toPlainState(room)
}

// ================= REACTIONS =================
export async function appendReaction(roomId, reaction) {
  const room = await Room.findById(roomId)

  room.reactions.push(reaction)
  room.reactions = room.reactions.slice(-40)
  room.updatedAtMs = Date.now()

  await room.save()
  return toPlainState(room)
}

// ================= QUEUE =================
export async function enqueueTrack(roomId, track) {
  const room = await Room.findById(roomId)

  room.queue.push(track)

  if (!room.nowPlaying.track) {
    room.nowPlaying.track = track
  }

  room.updatedAtMs = Date.now()

  await room.save()
  return toPlainState(room)
}

// ================= PLAYBACK =================
export async function updatePlayback(roomId, updater) {
  const room = await Room.findById(roomId)

  room.nowPlaying = updater(room.nowPlaying)
  room.updatedAtMs = Date.now()

  await room.save()
  return toPlainState(room)
}

// ================= REMOVE TRACK =================
export async function removeTrack(roomId, trackId) {
  const room = await Room.findById(roomId)

  const removedTrack = room.queue.find((t) => t.id === trackId)

  room.queue = room.queue.filter((t) => t.id !== trackId)

  if (room.nowPlaying.track?.id === trackId) {
    room.nowPlaying = {
      track: room.queue[0] ?? null,
      status: 'idle',
      startedAtMs: null,
      pausedAtMs: null,
      positionMs: 0,
      updatedAtMs: Date.now(),
      commandSeq: 0,
    }
  }

  if (removedTrack) {
    room.updatedAtMs = Date.now()
  }

  await room.save()
  return toPlainState(room)
}

// ================= REORDER =================
export async function reorderQueue(roomId, trackId, direction) {
  const room = await Room.findById(roomId)

  const index = room.queue.findIndex((t) => t.id === trackId)
  if (index < 0) return toPlainState(room)

  const newIndex = direction === 'up' ? index - 1 : index + 1

  if (newIndex < 0 || newIndex >= room.queue.length) {
    return toPlainState(room)
  }

  const temp = room.queue[index]
  room.queue[index] = room.queue[newIndex]
  room.queue[newIndex] = temp

  room.updatedAtMs = Date.now()

  await room.save()
  return toPlainState(room)
}

// ================= DELETE ROOM =================
export async function deleteRoom(roomId) {
  const result = await Room.findByIdAndDelete(roomId)
  return !!result
}

// ================= GET USER ROOMS =================
export async function getUserRooms(userId) {
  const rooms = await Room.find({ hostUserId: userId })
    .select('_id roomId roomName hostUserId members createdAtMs createdByName')
    .sort({ createdAtMs: -1 })
    .lean()

  return rooms.map((room) => {
    const memberCount = room.members instanceof Map
      ? room.members.size
      : (room.members ? Object.keys(room.members).length : 0)

    return {
      roomId: room.roomId || room._id,
      roomName: room.roomName,
      hostUserId: room.hostUserId,
      listeners: memberCount,
      createdByName: room.createdByName,
    }
  })
}

// ================= HISTORY =================
export async function appendHistory(roomId, entry) {
  const room = await Room.findById(roomId)
  if (!room) return null

  room.history.push(entry)
  room.history = room.history.slice(-50)
  room.updatedAtMs = Date.now()

  await room.save()
  return toPlainState(room)
}

// ================= SKIP VOTES =================
export async function addSkipVote(roomId, userId, trackId) {
  const room = await Room.findById(roomId)
  if (!room) return null

  // Reset if voting on a different track
  if (room.skipVotes?.trackId !== trackId) {
    room.skipVotes = { trackId, voters: [userId] }
  } else if (!room.skipVotes.voters.includes(userId)) {
    room.skipVotes.voters.push(userId)
  }

  room.updatedAtMs = Date.now()
  await room.save()
  return toPlainState(room)
}

export async function resetSkipVotes(roomId) {
  const room = await Room.findById(roomId)
  if (!room) return null

  room.skipVotes = { trackId: null, voters: [] }
  room.updatedAtMs = Date.now()

  await room.save()
  return toPlainState(room)
}