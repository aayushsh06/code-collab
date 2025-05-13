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

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        const users = getAllUsers(roomId);

        console.log(users)

        users.forEach(({socketId}) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                users,
                username,
                socketId: socket.id,
            })
        })
    })

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId : socket.id,
                username: userSocketMap[socket.id],
            })
        })
        delete userSocketMap[socket.id];
        socket.leave();
    })
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
