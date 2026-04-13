import { randomUUID } from 'node:crypto'
import { SOCKET_EVENTS } from '../../shared/contracts.js'
import {
  createRoom,
  addMember,
  removeMember,
  appendChatMessage,
  appendReaction,
  enqueueTrack,
  getRoomState,
  roomExists,
  removeTrack,
  reorderQueue,
  updatePlayback,
  deleteRoom,
  getUserRooms,
  appendHistory,
  addSkipVote,
  resetSkipVotes,
} from '../services/roomStore.js'
import {
  buildScheduledPlaybackUpdate,
  getServerClockPayload,
} from '../services/clockSync.js'
import { extractTrackMetadata } from '../services/trackMetadata.js'
import { searchYouTube } from '../services/searchYouTube.js'

export function registerRoomHandlers(io, socket) {
  const joinedRooms = new Set()

  // ================= ROOM CREATE =================
  socket.on(SOCKET_EVENTS.ROOM_CREATE, async (payload, acknowledge) => {
    const roomId = payload.roomId?.trim()
    const roomName = payload.roomName?.trim()

    const userId = socket.user.userId
    const displayName = socket.user.name

    if (!roomId || !roomName) {
      acknowledge?.({ ok: false, error: 'Room name is required' })
      return
    }

    const state = await createRoom(roomId, {
      roomName,
      createdByUserId: userId,
      createdByName: displayName,
      hostUserId: userId,
    })

    if (!state) {
      acknowledge?.({ ok: false, error: 'Room already exists' })
      return
    }

    socket.join(roomId)
    joinedRooms.add(roomId)

    const member = {
      id: userId,
      name: displayName,
      joinedAt: Date.now(),
    }

    const joinedState = await addMember(roomId, member)

    io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
      roomId,
      members: joinedState.members,
    })

    io.to(roomId).emit(SOCKET_EVENTS.ROOM_STATE, joinedState)

    acknowledge?.({ ok: true, state: joinedState })
  })

  // ================= ROOM JOIN =================
  socket.on(SOCKET_EVENTS.ROOM_JOIN, async (payload, acknowledge) => {
    const roomId = payload.roomId

    const userId = socket.user.userId
    const displayName = socket.user.name

    if (!roomId || !(await roomExists(roomId))) {
      acknowledge?.({ ok: false, error: 'Room not found' })
      return
    }

    socket.join(roomId)
    joinedRooms.add(roomId)

    const member = {
      id: userId,
      name: displayName,
      joinedAt: Date.now(),
    }

    const state = await addMember(roomId, member)

    io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
      roomId,
      members: state.members,
    })

    io.to(roomId).emit(SOCKET_EVENTS.ROOM_STATE, state)

    acknowledge?.({ ok: true, state })
  })

  // ================= MY ROOMS =================
  socket.on(SOCKET_EVENTS.MY_ROOMS_LIST, async (_payload, acknowledge) => {
    const userId = socket.user.userId
    const rooms = await getUserRooms(userId)
    acknowledge?.({ ok: true, rooms })
  })

  // ================= ROOM DELETE =================
  socket.on(SOCKET_EVENTS.ROOM_DELETE, async (payload, acknowledge) => {
    const roomId = payload.roomId
    const userId = socket.user.userId

    if (!roomId) {
      acknowledge?.({ ok: false, error: 'Room ID is required' })
      return
    }

    const state = await getRoomState(roomId)

    if (!state || !state.hostUserId) {
      acknowledge?.({ ok: false, error: 'Room not found' })
      return
    }

    if (state.hostUserId !== userId) {
      acknowledge?.({ ok: false, error: 'Only the host can delete this room' })
      return
    }

    // Notify everyone in the room before deleting
    io.to(roomId).emit(SOCKET_EVENTS.ROOM_STATE, null)

    // Make all sockets leave the room
    const socketsInRoom = await io.in(roomId).fetchSockets()
    for (const s of socketsInRoom) {
      s.leave(roomId)
    }

    await deleteRoom(roomId)
    joinedRooms.delete(roomId)

    acknowledge?.({ ok: true })
  })

  // ================= CLOCK SYNC =================
  socket.on(SOCKET_EVENTS.CLOCK_SYNC, (payload, acknowledge) => {
    acknowledge?.(getServerClockPayload(payload.clientSentAtMs))
  })

  // ================= CHAT =================
  socket.on(SOCKET_EVENTS.CHAT_SEND, async (payload) => {
    if (!payload.text?.trim()) return

    const message = {
      id: randomUUID(),
      userId: socket.user.userId,
      name: socket.user.name,
      text: payload.text.trim(),
      sentAtMs: Date.now(),
    }

    await appendChatMessage(payload.roomId, message)

    io.to(payload.roomId).emit(SOCKET_EVENTS.CHAT_NEW, message)
  })

  // ================= REACTIONS =================
  socket.on(SOCKET_EVENTS.REACTION_SEND, async (payload) => {
    const reaction = {
      id: randomUUID(),
      emoji: payload.emoji,
      userId: socket.user.userId,
      sentAtMs: Date.now(),
    }

    await appendReaction(payload.roomId, reaction)

    io.to(payload.roomId).emit(SOCKET_EVENTS.REACTION_BURST, reaction)
  })

  // ================= YOUTUBE SEARCH =================
  socket.on(SOCKET_EVENTS.SEARCH_YOUTUBE, async (payload, acknowledge) => {
    const results = await searchYouTube(payload.query, payload.limit ?? 8)
    acknowledge?.({ ok: true, results })
  })

  // ================= SKIP VOTE =================
  socket.on(SOCKET_EVENTS.SKIP_VOTE, async (payload) => {
    const roomId = payload.roomId
    const userId = socket.user.userId
    const state = await getRoomState(roomId)
    const currentTrackId = state?.nowPlaying?.track?.id

    if (!currentTrackId) return

    const updatedState = await addSkipVote(roomId, userId, currentTrackId)
    const skipVotes = updatedState.skipVotes
    const memberCount = Object.keys(updatedState.members || {}).length
    const threshold = Math.ceil(memberCount / 2)

    // Broadcast vote update
    io.to(roomId).emit(SOCKET_EVENTS.SKIP_VOTE_UPDATE, {
      roomId,
      skipVotes,
      memberCount,
    })

    // Check if majority reached
    if (skipVotes.voters.length >= threshold && threshold > 0) {
      // Reset votes first
      await resetSkipVotes(roomId)

      // Trigger next track
      const currentIndex = state.queue.findIndex((t) => t.id === currentTrackId)
      const nextInQueue = state.queue[currentIndex + 1] ?? null

      const nextState = await updatePlayback(roomId, (nowPlaying) =>
        buildScheduledPlaybackUpdate(
          { ...nowPlaying, track: nextInQueue },
          { type: nextInQueue ? 'play' : 'pause', positionMs: 0 },
        ),
      )

      io.to(roomId).emit(SOCKET_EVENTS.PLAYBACK_UPDATE, {
        roomId,
        nowPlaying: nextState.nowPlaying,
        queue: state.queue,
      })

      io.to(roomId).emit(SOCKET_EVENTS.ROOM_STATE, nextState)

      // Send cleared skip votes
      io.to(roomId).emit(SOCKET_EVENTS.SKIP_VOTE_UPDATE, {
        roomId,
        skipVotes: { trackId: null, voters: [] },
        memberCount,
      })
    }
  })

  // ================= QUEUE ADD =================
  socket.on(SOCKET_EVENTS.QUEUE_ADD, async (payload, acknowledge) => {
    const metadata = await extractTrackMetadata(payload.url)

    if (!metadata) {
      acknowledge?.({ ok: false, error: 'Unsupported provider URL' })
      return
    }

    const track = {
      id: randomUUID(),
      provider: metadata.provider,
      url: metadata.url,
      title: metadata.title,
      addedBy: socket.user.name,
      addedByUserId: socket.user.userId,
      createdAtMs: Date.now(),
    }

    const state = await enqueueTrack(payload.roomId, track)

    io.to(payload.roomId).emit(SOCKET_EVENTS.ROOM_STATE, state)

    acknowledge?.({ ok: true, track })
  })

  // ================= QUEUE REMOVE =================
  socket.on(SOCKET_EVENTS.QUEUE_REMOVE, async (payload) => {
    const state = await removeTrack(payload.roomId, payload.trackId)

    io.to(payload.roomId).emit(SOCKET_EVENTS.ROOM_STATE, state)
  })

  // ================= QUEUE REORDER =================
  socket.on(SOCKET_EVENTS.QUEUE_REORDER, async (payload) => {
    const state = await reorderQueue(
      payload.roomId,
      payload.trackId,
      payload.direction,
    )

    io.to(payload.roomId).emit(SOCKET_EVENTS.ROOM_STATE, state)
  })

  // ================= PLAYBACK =================
  socket.on(SOCKET_EVENTS.PLAYBACK_COMMAND, async (payload, acknowledge) => {
    const state = await getRoomState(payload.roomId)

    // Host can do anything. Non-hosts can only auto-advance via "next".
    const isHost = state.hostUserId && state.hostUserId === socket.user.userId
    const isAutoAdvance = payload.type === 'next' && !payload.hostTriggered

    if (!isHost && !isAutoAdvance) {
      acknowledge?.({ ok: false, error: 'Only the host can control playback' })
      return
    }

    if (payload.type === 'next' || payload.type === 'previous') {
      const currentId = state.nowPlaying?.track?.id
      const currentIndex = currentId
        ? state.queue.findIndex((t) => t.id === currentId)
        : -1

      const targetTrack = payload.type === 'next'
        ? (state.queue[currentIndex + 1] ?? null)
        : (state.queue[currentIndex - 1] ?? null)

      // Reset skip votes on track change
      await resetSkipVotes(payload.roomId)
      io.to(payload.roomId).emit(SOCKET_EVENTS.SKIP_VOTE_UPDATE, {
        roomId: payload.roomId,
        skipVotes: { trackId: null, voters: [] },
        memberCount: Object.keys(state.members || {}).length,
      })

      const updatedState = await updatePlayback(payload.roomId, (nowPlaying) =>
        buildScheduledPlaybackUpdate(
          { ...nowPlaying, track: targetTrack },
          { type: targetTrack ? 'play' : 'pause', positionMs: 0 },
        ),
      )

      // Record history for the target track if it starts playing
      if (targetTrack) {
        await appendHistory(payload.roomId, {
          trackId: targetTrack.id,
          title: targetTrack.title,
          provider: targetTrack.provider,
          url: targetTrack.url,
          playedBy: targetTrack.addedBy ?? socket.user.name,
          playedByUserId: targetTrack.addedByUserId ?? socket.user.userId,
          playedAtMs: Date.now(),
        })
      }

      io.to(payload.roomId).emit(SOCKET_EVENTS.PLAYBACK_UPDATE, {
        roomId: payload.roomId,
        nowPlaying: updatedState.nowPlaying,
        queue: state.queue,
      })

      io.to(payload.roomId).emit(SOCKET_EVENTS.ROOM_STATE, updatedState)
      return
    }

    const nextTrack =
      payload.track ?? state.nowPlaying.track ?? state.queue[0] ?? null

    // Record history when a track starts playing
    if (payload.type === 'play' && nextTrack) {
      await appendHistory(payload.roomId, {
        trackId: nextTrack.id,
        title: nextTrack.title,
        provider: nextTrack.provider,
        url: nextTrack.url,
        playedBy: nextTrack.addedBy ?? socket.user.name,
        playedByUserId: nextTrack.addedByUserId ?? socket.user.userId,
        playedAtMs: Date.now(),
      })

      // Reset skip votes on new track
      if (nextTrack.id !== state.nowPlaying?.track?.id) {
        await resetSkipVotes(payload.roomId)
        io.to(payload.roomId).emit(SOCKET_EVENTS.SKIP_VOTE_UPDATE, {
          roomId: payload.roomId,
          skipVotes: { trackId: null, voters: [] },
          memberCount: Object.keys(state.members || {}).length,
        })
      }
    }

    const updatedState = await updatePlayback(payload.roomId, (nowPlaying) =>
      buildScheduledPlaybackUpdate(
        { ...nowPlaying, track: nextTrack },
        payload,
      ),
    )

    io.to(payload.roomId).emit(SOCKET_EVENTS.PLAYBACK_UPDATE, {
      roomId: payload.roomId,
      nowPlaying: updatedState.nowPlaying,
      queue: state.queue,
    })

    io.to(payload.roomId).emit(SOCKET_EVENTS.ROOM_STATE, updatedState)
  })

  // ================= DISCONNECT =================
  socket.on('disconnect', async () => {
    const userId = socket.user?.userId

    if (!userId) {
      return
    }

    for (const roomId of joinedRooms) {
      try {
        const state = await removeMember(roomId, userId)

        if (state) {
          io.to(roomId).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
            roomId,
            members: state.members,
          })
        }
      } catch (error) {
        console.error(`Failed to remove ${userId} from ${roomId}:`, error)
      }
    }

    joinedRooms.clear()
  })
}