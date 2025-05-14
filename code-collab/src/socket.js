import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        transports: ['websocket'],
    };

    const URL = process.env.NODE_ENV === 'production' 
        ? window.location.origin
        : 'http://localhost:5001';

    return io(URL, options);
};
