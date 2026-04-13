import cors from 'cors'
import express from 'express'
import http from 'node:http'
import { Server } from 'socket.io'
import { config } from './config.js'
import healthRouter from './routes/health.js'
import { registerRoomHandlers } from './sockets/registerRoomHandlers.js'
import authRouter from "./routes/Auth.js"
import jwt from 'jsonwebtoken'
import { connectDB } from "./db/connection.js"

await connectDB()

const app = express()

app.use(
  cors({
    origin: config.corsOrigin,
  }),
)
app.use(express.json())
app.use('/api', healthRouter)
app.use('/api/auth', authRouter)

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
})

io.use((socket, next) => {
  const token = socket.handshake.auth?.token

  if (!token) {
    return next(new Error('Authentication error'))
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    socket.user = decoded
    next()
  } catch {
    next(new Error('Authentication error'))
  }
})

io.on('connection', (socket) => {
  registerRoomHandlers(io, socket)
})

server.listen(config.port, () => {
  console.log(`Musicyfy server listening on http://localhost:${config.port}`)
})
