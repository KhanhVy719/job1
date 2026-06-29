// lib/socket.ts (hoặc utils/socket.ts)
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SERVER_URL; 

// Khởi tạo Singleton
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false, // Quan trọng: Để ta tự quản lý lúc nào cần connect
  reconnection: true,
  transports: ['websocket'],
});