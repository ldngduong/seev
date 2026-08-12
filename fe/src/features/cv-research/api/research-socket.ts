import { io } from 'socket.io-client'
import { getApiBaseUrl } from '@/shared/lib/runtime-env'

const apiUrl = getApiBaseUrl()
const researchSocketUrl = `${new URL(apiUrl, window.location.origin).origin}/research`

export const researchSocket = io(researchSocketUrl, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket'],
})
