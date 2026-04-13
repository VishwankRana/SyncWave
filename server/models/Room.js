import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    joinedAt: Number,
  },
  { _id: false }
)

const trackSchema = new mongoose.Schema(
  {
    id: String,
    provider: String,
    url: String,
    title: String,
    addedBy: String,
    addedByUserId: String,
    createdAtMs: Number,
  },
  { _id: false }
)

const chatSchema = new mongoose.Schema(
  {
    id: String,
    userId: String,
    name: String,
    text: String,
    sentAtMs: Number,
  },
  { _id: false }
)

const reactionSchema = new mongoose.Schema(
  {
    id: String,
    emoji: String,
    userId: String,
    sentAtMs: Number,
  },
  { _id: false }
)

const historySchema = new mongoose.Schema(
  {
    trackId: String,
    title: String,
    provider: String,
    url: String,
    playedBy: String,
    playedByUserId: String,
    playedAtMs: Number,
  },
  { _id: false }
)

const skipVotesSchema = new mongoose.Schema(
  {
    trackId: String,
    voters: { type: [String], default: [] },
  },
  { _id: false }
)

const nowPlayingSchema = new mongoose.Schema(
  {
    track: trackSchema,
    status: {
      type: String,
      enum: ['idle', 'playing', 'paused', 'buffering'],
      default: 'idle',
    },
    startedAtMs: Number,
    pausedAtMs: Number,
    positionMs: Number,
    updatedAtMs: Number,
    commandSeq: Number,
  },
  { _id: false }
)

const roomSchema = new mongoose.Schema({
  _id: String, // roomId
  roomId: String,
  roomName: String,
  hostUserId: String,

  members: {
    type: Map,
    of: memberSchema,
    default: {},
  },

  queue: {
    type: [trackSchema],
    default: [],
  },

  chat: {
    type: [chatSchema],
    default: [],
  },

  reactions: {
    type: [reactionSchema],
    default: [],
  },

  nowPlaying: {
    type: nowPlayingSchema,
    default: () => ({
      status: 'idle',
      positionMs: 0,
      updatedAtMs: Date.now(),
      commandSeq: 0,
    }),
  },

  history: {
    type: [historySchema],
    default: [],
  },

  skipVotes: {
    type: skipVotesSchema,
    default: () => ({ trackId: null, voters: [] }),
  },

  createdAtMs: Number,
  createdByUserId: String,
  createdByName: String,
  updatedAtMs: Number,
})

export const Room = mongoose.model('Room', roomSchema)