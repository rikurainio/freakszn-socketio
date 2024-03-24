import { io } from "socket.io-client";

const socket = io("ws://localhost:3000")

setTimeout(() => {
  console.log('socket connected:', socket.connected)
}, (2000));