import { createServer } from "http";
import { Server } from "socket.io";
import { Queue } from "./core/queue";
import { Player } from "./core/player";
import { Game } from "./core/game";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  },
});

const players: Record<string, Player> = {}
const game = new Game()
const queue = new Queue(io, players, game)


io.on("connection", (socket) => {
  console.log('connection')
  socket.join('freakszn')
  const player = new Player(socket)
  const id = socket.id

  if (!players[socket.id]) {
    players[socket.id] = player
  }

  socket.on("queue", (data) => {
    queue.queue(socket.id, data)
  })

  socket.on("dequeue", () => {
    queue.deQueue(id)
  })

  socket.on("accept", () => {
    queue.accept(id)
  })

  socket.on("set-client-open", (data) => {
    player.setClientOpen(data)
  })

  socket.on("set-ingame", (data) => {
    player.setInGame(data)
  })
  
  socket.on("set-name", (data) => {
    player.setName(data)
  })

  socket.on("join-lobby", () => {
    game.joinLobby(player)
  })

  socket.on("set-current-lobby-id", (data) => {
    game.setLobbyID(data)
  })

  socket.on("disconnecting", () => {
    delete players[socket.id]
  })
});


httpServer.listen(3000, () => {
  console.log('morbba :--D')
});