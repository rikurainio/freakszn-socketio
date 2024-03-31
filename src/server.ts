import { createServer } from "http";
import { Server } from "socket.io";
import { Queue } from "./core/queue";
import { Player } from "./core/player";
import { Game } from "./core/game";
import { Logger } from "./lib/logger";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  },
});

const players: Record<string, Player> = {}
const games: Record<string, Game> = {}
const queue = new Queue(io, players, games)


io.on("connection", (socket) => {
  console.log('connection')
  socket.join('freakszn')
  const player = new Player(socket)
  const id = socket.id

  if (!players[socket.id]) {
    players[socket.id] = player
  }

  queue.emitState()

  socket.on("queue", (role) => {
    Logger.qa("queue", role, socket.id)
    queue.queue(socket.id, role)
  })

  socket.on("mock-accept-all", () => {
    Logger.qa("mock-accept-all")
    queue.mockAcceptAll()
  })

  socket.on("dequeue", () => {
    Logger.qa("dequeue", id)
    queue.deQueue(socket.id)
  })

  socket.on("accept", () => {
    Logger.qa("accept", id)
    queue.accept(socket.id)
  })

  socket.on("set-client-open", (data) => {
    Logger.qa("set-client-open", data)
    player.setClientOpen(data)
  })

  socket.on("set-ingame", (data) => {
    Logger.qa("set-ingame", data)
    player.setInGame(data)
  })
  
  socket.on("set-name", (data) => {
    Logger.qa("set-name", data)
    player.setName(data)
  })

  socket.on("join-lobby", () => {
    Logger.qa("join-lobby", player.name)
    if (!player.currentGame) { return }
    player.currentGame.autoJoinLobby()
  })

  socket.on("set-current-lobby-id", (data) => {
    Logger.qa("set-current-lobby-id", data)
    if (!player.currentGame || player.currentGame.currentLobbyID === data) { return }
    player.currentGame.setLobbyID(data)
  })

  socket.on("disconnecting", () => {
    delete players[socket.id]
  })
});

httpServer.listen(3000, () => {
  console.log('morbba :--D')
});