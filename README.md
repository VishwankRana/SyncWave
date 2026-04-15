# SyncWave

A real-time collaborative music streaming platform that enables groups of users to create virtual rooms, queue YouTube music together, and enjoy synchronized playback with live chat.

## Features

### **Music Playback**

- **YouTube Integration**: Search and stream millions of songs from YouTube
- **Synchronized Playback**: Advanced clock synchronization ensures perfect audio sync across all users
- **Queue Management**: Add, remove, and reorder tracks in the shared queue
- **Playback Controls**: Play, pause, seek, and skip with command sequencing to prevent race conditions
- **History Tracking**: View all previously played tracks with metadata

### **Collaborative Features**

- **Create & Join Rooms**: Create custom music rooms and join with room codes
- **Real-Time Presence**: See who's in the room and when they joined
- **Live Chat**: Send and receive messages within the room
- **Emoji Reactions**: React to the music with emoji "bursts" in real-time
- **Democratic Skipping**: Members can vote to skip the current track

### **Authentication**

- **User Accounts**: Secure registration and login with bcryptjs password hashing
- **JWT Tokens**: Token-based authentication with 7-day expiration
- **Session Persistence**: Tokens stored in browser for seamless experience

## Tech Stack

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

## Authentication Flow

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

## Clock Synchronization

SyncWave uses an advanced clock synchronization algorithm to ensure perfect music sync:

1. **Client sends request** with timestamp
2. **Server responds** with three timestamps:
   - When it received the request
   - When it's sending the response
3. **Client calculates** network latency
4. **All clients sync** to server time
5. **Playback starts** with 1.2s lead time for safety

This ensures all users' music plays in perfect sync despite network latency.

## Architecture Highlights

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
