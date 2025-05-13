import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { ACTIONS } from './src/Actions.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// LOOK AT OTHER ALTERNATIVES WITH DB
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
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
    
        const users = getAllUsers(roomId);
    
        console.log(users);
    
        users.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                users,
                username,
                socketId: socket.id,
            });
        });
    });
    
    // SYNC_CODE
    socket.on(ACTIONS.SYNC_CODE, ({ code, roomId }) => {
        if (roomId) {
            io.to(roomId).emit(ACTIONS.SYNC_CODE_RESPONSE, { code });
        }
    });

    // CODE EDITOR 
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, changes }) => {
        socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { changes });
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
    //CODE EDITOR END

    socket.on('disconnecting', () => {
        console.log('socket disconnected', socket.id);
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            })
        })
        delete userSocketMap[socket.id];
        socket.leave();
    })
});


const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
