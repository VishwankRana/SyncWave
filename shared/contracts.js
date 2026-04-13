export const SOCKET_EVENTS = {
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_DELETE: 'room:delete',
  ROOM_STATE: 'room:state',
  MY_ROOMS_LIST: 'room:myRooms',
  QUEUE_ADD: 'queue:add',
  QUEUE_REORDER: 'queue:reorder',
  QUEUE_REMOVE: 'queue:remove',
  PLAYBACK_COMMAND: 'playback:command',
  PLAYBACK_UPDATE: 'playback:update',
  CHAT_SEND: 'chat:send',
  CHAT_NEW: 'chat:new',
  REACTION_SEND: 'reaction:send',
  REACTION_BURST: 'reaction:burst',
  CLOCK_SYNC: 'clock:sync',
  PRESENCE_UPDATE: 'presence:update',
  SEARCH_YOUTUBE: 'search:youtube',
  SKIP_VOTE: 'skip:vote',
  SKIP_VOTE_UPDATE: 'skip:update',
}

export const PLAYBACK_STATUSES = ['idle', 'playing', 'paused', 'buffering']

export function createEmptyRoomState(roomId, hostUserId = null) {
  return {
    roomId,
    hostUserId,
    members: {},
    queue: [],
    chat: [],
    reactions: [],
    nowPlaying: {
      track: null,
      status: 'idle',
      startedAtMs: null,
      pausedAtMs: null,
      positionMs: 0,
      updatedAtMs: Date.now(),
      commandSeq: 0,
    },
  }
}
