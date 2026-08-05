import { io } from 'socket.io-client'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const researchSocketUrl = `${new URL(apiUrl, window.location.origin).origin}/research`

export const researchSocket = io(researchSocketUrl, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket'],
})
