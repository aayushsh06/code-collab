import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { ACTIONS } from './src/Actions.js';
import { createClient } from 'redis';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('.')) {
    return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
  next();
});

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    socket: {
        reconnectStrategy: (retries) => {
            console.log(`Redis reconnection attempt ${retries}`);
            return Math.min(retries * 1000, 10000);
        },
        connectTimeout: 10000, 
    },
    ...(process.env.REDIS_TLS === 'true' ? { 
        socket: { tls: true, rejectUnauthorized: false } 
    } : {})
});

console.log('REDIS_URL', process.env.REDIS_URL);

redisClient.on('error', (err) => {
    console.log('Redis Client Error', err);
    console.log('Redis connection details:', {
        url: process.env.REDIS_URL ? 'Set from environment' : 'Using default',
        tls: process.env.REDIS_TLS === 'true'
    });
});

redisClient.on('connect', () => {
    console.log('Redis client connected');
});

redisClient.on('reconnecting', () => {
    console.log('Redis client reconnecting');
});

let redisConnected = false;
(async () => {
    try {
        await redisClient.connect();
        redisConnected = true;
        console.log('Successfully connected to Redis');
        
        try {
            await redisClient.set('test:connection', 'Connected');
            const testValue = await redisClient.get('test:connection');
            console.log('Redis test value:', testValue);
        } catch (error) {
            console.log('Redis test operation failed:', error);
        }
    } catch (error) {
        console.log('Failed to connect to Redis:', error);
        redisConnected = false;
    }
})();

const roomVersions = {};

const userSocketMap = {};
function getAllUsers(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
        return {
            socketId,
            username: userSocketMap[socketId],
        }
    });
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // JOINING LOGIC
    socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
        console.log('User joining room:', username, 'Room ID:', roomId);
        userSocketMap[socket.id] = username;
        socket.join(roomId);
    
        const users = getAllUsers(roomId);
    
        console.log('Users in room:', users);
    
        const savedCode = await getCodeFromRedis(roomId);
        
        socket.emit(ACTIONS.SYNC_CODE_RESPONSE, { code: savedCode });
        
        // Get room language
        const roomLanguage = await getLanguageFromRedis(roomId);
        if (roomLanguage) {
            console.log('Sending initial room language to new user:', roomLanguage);
            socket.emit(ACTIONS.ROOM_LANGUAGE, {
                language: roomLanguage
            });
        }
    
        users.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                users,
                username,
                socketId: socket.id,
            });
        });
    });
    
    // SYNC_CODE
    socket.on(ACTIONS.SYNC_CODE, async ({ code, roomId, clientVersion }) => {
        if (roomId) {
            if (code !== undefined) {
                const newVersion = await saveCodeToRedis(roomId, code);
                io.to(roomId).emit(ACTIONS.SYNC_CODE_RESPONSE, { code, version: newVersion });
            } else {
                const { code, version } = await getCodeFromRedis(roomId);
                
                if (!clientVersion || version > clientVersion) {
                    socket.emit(ACTIONS.SYNC_CODE_RESPONSE, { code, version });
                }
            }
        }
    });

    // CODE EDITOR 
    socket.on(ACTIONS.CODE_CHANGE, async ({ roomId, changes }) => {
        socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { changes });
        
        const currentEditor = io.sockets.sockets.get(socket.id);
        if (currentEditor && roomId) {
            socket.emit(ACTIONS.REQUEST_CURRENT_CODE, { roomId });
        }
    });
    
    socket.on(ACTIONS.SEND_CURRENT_CODE, async ({ roomId, code, force = false, clientVersion }) => {
        if (roomId && code !== undefined) {
            if (force || (code && code.trim() !== '// Write your code here')) {
                const serverVersion = roomVersions[roomId] || 0;
                
                if (force || !clientVersion || serverVersion <= clientVersion) {
                    await saveCodeToRedis(roomId, code);
                }
            }
        }
    });
    
    socket.on(ACTIONS.CURSOR_CHANGE, ({ roomId, position, username, color }) => {
        socket.to(roomId).emit(ACTIONS.CURSOR_CHANGE, {
            position,
            username,
            color
        });
    });

    socket.on(ACTIONS.SELECTION_CHANGE, ({ roomId, selection, username, color }) => {
        socket.to(roomId).emit(ACTIONS.SELECTION_CHANGE, {
            selection,
            username,
            color
        });
    });
    
    socket.on(ACTIONS.CURSOR_LEAVE, ({ roomId, username }) => {
        socket.to(roomId).emit(ACTIONS.CURSOR_LEAVE, {
            username
        });
    });
    
    socket.on(ACTIONS.LANGUAGE_CHANGE, async ({ roomId, language, username }) => {
        socket.to(roomId).emit(ACTIONS.LANGUAGE_CHANGE, {
            language,
            username
        });
        if(redisConnected) {
            try {
                await redisClient.set(`room:${roomId}:language`, language);
                await redisClient.expire(`room:${roomId}:language`, 86400);
            } catch (error) {
                console.log('Error saving language to Redis:', error);
            }
        }
    });

    socket.on(ACTIONS.REQUEST_LANGUAGE, async ({ roomId }) => {
        if (roomId) {
            const roomLanguage = await getLanguageFromRedis(roomId);
            if (roomLanguage) {
                socket.emit(ACTIONS.ROOM_LANGUAGE, {
                    language: roomLanguage
                });
            } else {
                console.log('No language found for room:', roomId);
            }
        } else {
            console.log('Cannot get language - Room ID missing');
        }
    });

    socket.on(ACTIONS.DISCONNECTED, ({ socketId, username, roomId }) => {
        if (roomId) {

            socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username
            });
            
            socket.leave(roomId);
        }
    });
    //CODE EDITOR END

    socket.on(ACTIONS.REQUEST_CODE, async ({ roomId, clientVersion }) => {
        if (roomId) {
            try {
                const { code, version } = await getCodeFromRedis(roomId);
                
                if (!clientVersion || version > clientVersion) {
                    socket.emit(ACTIONS.SYNC_CODE_RESPONSE, { code, version });
                } else {
                    socket.emit(ACTIONS.SYNC_CODE_RESPONSE, { version, upToDate: true });
                }
            } catch (err) {
                socket.emit(ACTIONS.SYNC_CODE_RESPONSE, { code: '// Error retrieving code', version: 0 });
            }
        }
    });

    socket.on('disconnecting', () => {
        console.log('socket disconnected', socket.id);
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});


const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

process.on('SIGINT', async () => {
    await redisClient.quit();
    process.exit(0);
});

async function getCodeFromRedis(roomId) {
    if (!redisConnected) {
        console.log('Redis not connected, returning default code');
        return { code: '// Write Code Here', version: 0 };
    }
    
    try {
        const code = await redisClient.get(`room:${roomId}:code`);
        const version = await redisClient.get(`room:${roomId}:version`) || '0';
        
        roomVersions[roomId] = parseInt(version, 10);

        if(getAllUsers(roomId).length === 0) {
            return { code: '// Write Code Here', version: 0 };
        }

        return { code: code || '', version: parseInt(version, 10) };
    } catch (error) {
        console.log('Error getting code from Redis:', error);
        return { code: '// Write Code Here', version: 0 };
    }
}

async function saveCodeToRedis(roomId, code) {
    if (!redisConnected) {
        console.log('Redis not connected, cannot save code');
        return false;
    }
    
    try {
        const currentCode = await redisClient.get(`room:${roomId}:code`);
        
        if (currentCode !== code) {
            const version = (roomVersions[roomId] || 0) + 1;
            roomVersions[roomId] = version;
            
            await redisClient.set(`room:${roomId}:code`, code);
            await redisClient.set(`room:${roomId}:version`, version.toString());
            
            await redisClient.expire(`room:${roomId}:code`, 86400);
            await redisClient.expire(`room:${roomId}:version`, 86400);
            
            return version;
        } else {
            const version = roomVersions[roomId] || 0;
            return version;
        }
    } catch (error) {
        console.log('Error saving code to Redis:', error);
        return false;
    }
}

async function getLanguageFromRedis(roomId) {
    if (!redisConnected) {
        console.log('Redis not connected, cannot get language');
        return null;
    }
    
    try {
        const language = await redisClient.get(`room:${roomId}:language`);
        console.log(`Retrieved language for room ${roomId}:`, language);
        return language;
    } catch (error) {
        console.log('Error getting language from Redis:', error);
        return null;
    }
}

