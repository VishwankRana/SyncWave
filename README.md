# 🎵 SyncWave (Musicyfy)

A real-time collaborative music streaming platform that enables groups of users to create virtual rooms, queue YouTube music together, and enjoy synchronized playback with live chat and reactions.

## ✨ Features

### 🎶 **Music Playback**

- **YouTube Integration**: Search and stream millions of songs from YouTube
- **Synchronized Playback**: Advanced clock synchronization ensures perfect audio sync across all users
- **Queue Management**: Add, remove, and reorder tracks in the shared queue
- **Playback Controls**: Play, pause, seek, and skip with command sequencing to prevent race conditions
- **History Tracking**: View all previously played tracks with metadata

### 👥 **Collaborative Features**

- **Create & Join Rooms**: Create custom music rooms and invite others via room ID
- **Real-Time Presence**: See who's in the room and when they joined
- **Live Chat**: Send and receive messages within the room
- **Emoji Reactions**: React to the music with emoji "bursts" in real-time
- **Democratic Skipping**: Members can vote to skip the current track

### 🔐 **Authentication**

- **User Accounts**: Secure registration and login with bcryptjs password hashing
- **JWT Tokens**: Token-based authentication with 7-day expiration
- **Session Persistence**: Tokens stored in browser for seamless experience

## 🛠️ Tech Stack

### Backend

- **[Node.js](https://nodejs.org/)** - JavaScript runtime (ES modules)
- **[Express.js](https://expressjs.com/)** - Web framework for REST APIs
- **[Socket.IO](https://socket.io/)** - Real-time bidirectional communication
- **[MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/)** - NoSQL database with ODM
- **[JWT](https://jwt.io/)** - Secure token-based authentication
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** - Password hashing
- **[youtube-sr](https://github.com/Androz2091/youtube-sr)** - YouTube search and metadata extraction

### Frontend

- **[React 19](https://react.dev/)** - UI framework
- **[Vite](https://vitejs.dev/)** - Fast build tool with HMR
- **[Socket.IO Client](https://socket.io/)** - Real-time client communication
- **CSS3** - Modern styling

## 📋 Prerequisites

- **Node.js** v18+ and npm
- **MongoDB** (local or remote instance)
- **npm** package manager

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SyncWave
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001
CORS_ORIGIN=http://localhost:5173

# Database
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=musicyfy

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Important:** Change `JWT_SECRET` to a strong random string in production.

### 4. Start MongoDB

If using local MongoDB:

```bash
mongod
```

Or use MongoDB Atlas (cloud):

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/musicyfy
```

### 5. Run Development Servers

**Terminal 1 - Backend:**

```bash
npm run server:dev
```

Server runs on `http://localhost:3001`

**Terminal 2 - Frontend:**

```bash
npm run dev
```

Client runs on `http://localhost:5173`

## 📁 Project Structure

```
SyncWave/
├── client/                          # React frontend
│   ├── components/
│   │   ├── AuthScreen.jsx          # Login/register UI
│   │   ├── RoomWorkspace.jsx       # Main room interface
│   │   ├── Sidebar.jsx             # Room navigation
│   │   ├── PlayerPanel.jsx         # Now-playing display
│   │   ├── QueuePanel.jsx          # Queue management
│   │   ├── ChatPanel.jsx           # Live chat
│   │   ├── HistoryPanel.jsx        # Play history
│   │   ├── ReactionBar.jsx         # Emoji reactions
│   │   └── LandingPage.jsx         # Join room screen
│   ├── hooks/
│   │   └── useMusicyfyApp.js       # Custom app logic hook
│   ├── lib/
│   │   ├── auth.js                 # Auth API calls & token management
│   │   └── musicyfy.js             # Room utilities & helpers
│   ├── App.jsx                     # Main app component
│   └── main.jsx                    # React entry point
│
├── server/                          # Express backend
│   ├── config.js                   # Environment configuration
│   ├── index.js                    # Server entry point
│   ├── db/
│   │   └── connection.js           # MongoDB/Mongoose connection
│   ├── models/
│   │   ├── User.js                 # User schema
│   │   └── Room.js                 # Room schema
│   ├── routes/
│   │   ├── Auth.js                 # Auth endpoints (register/login)
│   │   └── health.js               # Health check endpoint
│   ├── middleware/
│   │   └── auth.js                 # JWT verification middleware
│   ├── services/
│   │   ├── roomStore.js            # Room CRUD operations
│   │   ├── clockSync.js            # Clock synchronization logic
│   │   ├── searchYouTube.js        # YouTube search service
│   │   ├── trackMetadata.js        # Track metadata extraction
│   │   ├── providerAdapters.js     # Media provider adapters
│   │   └── roomStore.js            # Room state management
│   └── sockets/
│       └── registerRoomHandlers.js # Socket.IO event handlers
│
├── shared/
│   └── contracts.js                # Socket event definitions & types
│
├── package.json
├── vite.config.js
├── eslint.config.js
└── README.md
```

## 🔌 Socket.IO Events

### Room Management

- **`room:create`** - Create a new room
- **`room:join`** - Join an existing room
- **`room:delete`** - Delete a room
- **`room:state`** - Receive full room state
- **`room:myRooms`** - Get user's rooms list

### Queue Operations

- **`queue:add`** - Add track to queue
- **`queue:remove`** - Remove track from queue
- **`queue:reorder`** - Reorder queue tracks

### Playback Control

- **`playback:command`** - Send play/pause/seek commands
- **`playback:update`** - Receive playback state updates

### Chat & Reactions

- **`chat:send`** - Send chat message
- **`chat:new`** - Receive new message
- **`reaction:send`** - Send emoji reaction
- **`reaction:burst`** - Receive reaction burst

### Other

- **`presence:update`** - Room member presence changes
- **`search:youtube`** - Search YouTube videos
- **`skip:vote`** - Vote to skip current track
- **`skip:update`** - Skip vote count update
- **`clock:sync`** - Server clock synchronization

## 🔐 Authentication Flow

1. **Register**: User creates account with name, email, password
   - Password hashed with bcryptjs (10-round salt)
   - User stored in MongoDB

2. **Login**: User provides email and password
   - Password verified against hash
   - JWT token generated (7-day expiration)
   - Token returned to client

3. **Connect**: Client establishes Socket.IO connection
   - JWT token sent in handshake auth
   - Server verifies token before allowing connection
   - User data attached to socket object

4. **Session**: Token stored in browser localStorage
   - Auto-attached to future API calls
   - Survives page refreshes

## 🎵 Clock Synchronization

SyncWave uses an advanced clock synchronization algorithm to ensure perfect music sync:

1. **Client sends request** with timestamp
2. **Server responds** with three timestamps:
   - When it received the request
   - When it's sending the response
3. **Client calculates** network latency
4. **All clients sync** to server time
5. **Playback starts** with 1.2s lead time for safety

This ensures all users' music plays in perfect sync despite network latency.

## 🏗️ Architecture Highlights

### Real-Time Communication

- **WebSockets via Socket.IO** for instant updates
- **Room-based broadcasting** for efficient message routing
- **Acknowledgment callbacks** for operation validation

### Data Persistence

- **MongoDB** for durable room data, chat history, play history
- **Event-driven updates** for real-time synchronization
- **Eventual consistency** model for distributed state

### Scalability

- **Room isolation** enables unlimited concurrent rooms
- **Atomic database operations** prevent race conditions
- **Memory-efficient** array slicing for chat/history

### Security

- **JWT tokens** for stateless authentication
- **bcryptjs hashing** for password security
- **Socket.IO middleware** for connection validation
- **CORS protection** for cross-domain requests

## 📦 Available Scripts

```bash
# Development
npm run dev              # Start Vite dev server (client)
npm run server:dev      # Start Node server with auto-reload

# Production
npm run build           # Build client for production
npm run server:start    # Start Node server

# Linting
npm run lint            # Run ESLint

# Preview
npm run preview         # Preview production build locally
```

## 🌐 Deployment

### Frontend (Vite)

```bash
npm run build
# Outputs to dist/ - deploy to Vercel, Netlify, or any static host
```

### Backend (Node.js)

Deploy to Heroku, Railway, Render, or any Node.js hosting:

```bash
# Set environment variables in hosting platform
# Push code and server automatically starts with npm start
```

## 🐛 Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in `.env` file
- For MongoDB Atlas, verify IP whitelist allows your connection

### Socket Connection Failed

- Check `CORS_ORIGIN` matches your frontend URL
- Verify backend is running on port 3001
- Check browser console for WebSocket errors

### Clock Sync Issues

- Ensure system time is accurate on all devices
- Check network latency with browser DevTools → Network

### YouTube Search Not Working

- Verify internet connection
- Check youtube-sr library hasn't hit rate limits
- YouTube search may be blocked in some regions (VPN required)

## 💡 Technical Concepts

- **WebSocket Protocol** for real-time communication
- **JWT Authentication** for stateless security
- **MongoDB Document Model** for flexible schemas
- **Clock Synchronization Algorithm** for perfect sync
- **Command Sequencing** for race condition prevention
- **Room Namespacing** for isolation and scalability
- **Service Layer Pattern** for maintainability

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Future Enhancements

- [ ] Support for Spotify integration
- [ ] Audio visualization during playback
- [ ] Advanced room permissions (moderators, banned users)
- [ ] Persistent playlists
- [ ] Mobile app (React Native)
- [ ] Voice chat integration
- [ ] Analytics dashboard

## 📧 Support

For issues, questions, or suggestions, please:

- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section above

---

**Made with ❤️ for music lovers who want to listen together** 🎧
