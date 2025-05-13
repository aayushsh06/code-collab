import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        transports: ['websocket'],
    };

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    if (!backendUrl) {
        throw new Error('VITE_BACKEND_URL is not defined in the environment');
    }

    return io(backendUrl, options);
};
