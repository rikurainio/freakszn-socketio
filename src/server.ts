import { createServer } from "http";
import { Server } from "socket.io";
import { Queue } from "./queue/queue";

const httpServer = createServer();
const io = new Server(httpServer, {
  // ...
});
const queue = new Queue(io)


io.on("connection", (socket) => {
  console.log('connection')
  socket.join('freakszn')
});

io.on("queue", (socket) => {
  queue.queue(socket, "mid")
})

httpServer.listen(3000, () => {
  console.log('morbba :--D')
});