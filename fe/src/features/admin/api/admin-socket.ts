import { io } from 'socket.io-client'
const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
export const adminSocket = io(`${baseUrl}/admin`, { autoConnect: false, withCredentials: true, transports: ['websocket', 'polling'] })
