import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { ACTIONS } from './src/Actions.js';
import { createClient } from 'redis';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Redis Client Setup
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            return Math.min(retries * 50, 1000);
        }
    }
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect to Redis
(async () => {
    await redisClient.connect();
    
    try {
        await redisClient.set('test:connection', 'Connected');
        await redisClient.get('test:connection');
    } catch (error) {
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
        userSocketMap[socket.id] = username;
        socket.join(roomId);
    
        const users = getAllUsers(roomId);
    
        console.log(users);
    
        const savedCode = await getCodeFromRedis(roomId);
        
        socket.emit(ACTIONS.SYNC_CODE_RESPONSE, { code: savedCode });
    
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
    try {
        const code = await redisClient.get(`room:${roomId}:code`);
        const version = await redisClient.get(`room:${roomId}:version`) || '0';
        
        roomVersions[roomId] = parseInt(version, 10);
        
        return { code: code || '// Write your code here', version: parseInt(version, 10) };
    } catch (error) {
        return { code: '// Write your code here', version: 0 };
    }
}

async function saveCodeToRedis(roomId, code) {
    try {
        const version = (roomVersions[roomId] || 0) + 1;
        roomVersions[roomId] = version;
        
        await redisClient.set(`room:${roomId}:code`, code);
        await redisClient.set(`room:${roomId}:version`, version.toString());
        
        await redisClient.expire(`room:${roomId}:code`, 86400);
        await redisClient.expire(`room:${roomId}:version`, 86400);
        
        const savedCode = await redisClient.get(`room:${roomId}:code`);
        
        return version;
    } catch (error) {
        return false;
    }
}