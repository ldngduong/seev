import { io } from 'socket.io-client'
import { getApiBaseUrl } from '@/shared/lib/runtime-env'

const baseUrl = getApiBaseUrl()
export const adminSocket = io(`${baseUrl}/admin`, { autoConnect: false, withCredentials: true, transports: ['websocket', 'polling'] })
