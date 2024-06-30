import { createServer } from "http";
import { Server } from "socket.io";
import { Queue } from "./core/queue";
import { Player } from "./core/player";
import { Game } from "./core/game";
import { Logger } from "./lib/logger";
import { Duo } from "./core/duo";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  },
});

const players: Record<string, Player> = {}
const games: Record<string, Game> = {}
const queue = new Queue(io, players, games)
const duo = new Duo(players, queue)


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

  socket.on("duo-queue", (data ) => { // {duoName: string, duoTagline: string, myRole: role, duoRole: role}
    Logger.qa("duo-queue", data)
    const duoPlayer = Object.values(players).find(player => player.name === data["duoName"] && player.tagline === data["duoTagline"])
    if (!duoPlayer) {return}
    duo.duoRequest(player, {
      duoName: data["duoName"]+data["duoTagline"],
      myRole: data["myRole"],
      duoRole: data["duoRole"]
    })
  })

  socket.on("duo-accept", () => {
    Logger.qa("duo-accept")
    duo.acceptDuo(player)
  })

  socket.on("duo-decline", () => {
    Logger.qa("duo-decline")
    duo.declineDuo(player)
  })

  socket.on("duo-cancel", () => {
    Logger.qa("duo-cancel")
    duo.cancelDuo(player)
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

  socket.on("decline", () => {
    Logger.qa("decline")
    queue.decline(socket.id)
  })

  socket.on("set-client-open", (data) => {
    Logger.qa("set-client-open", data)
    player.setClientOpen(data)
  })

  socket.on("set-ready", (data) => {
    Logger.qa("set-ready", data)
    player.setReady(data)
  })

  socket.on("set-ingame", (data) => {
    Logger.qa("set-ingame", data)
    player.setInGame(data)
  })
  
  socket.on("set-name", (data) => {
    Logger.qa("set-name", data)
    player.setName(data)
    queue.emitState()
  })

  socket.on("set-tagline", (data) => {
    Logger.qa("set-tagline", data)
    player.setTagline(data)
    queue.emitState()
  })

  socket.on("set-icon-id", (data) => {
    Logger.qa("set-icon-id", data)
    player.setIconId(data)
    queue.emitState()
  })

  socket.on("set-summoner-level", (data) => {
    Logger.qa("set-summoner-level", data)
    player.setSummonerLevel(data)
    queue.emitState()
  })
  
  socket.on("set-summoner-rank", (data) => {
    Logger.qa("set-summoner-rank", data)
    player.setRank(data)
  })

  socket.on("update-in-lobby", (data) => {
    Logger.qa("update-in-lobby", data)
    player.setInLobby(data)
  })

  socket.on("current-lobby-name", (data) => {
    Logger.qa("current-lobby-name", data)
    player.setCurrentLobbyName(data)
  })

  socket.on("open-draft", (data) => {
    Logger.qa("open-draft", data)
    player.openDraft()
  })

  socket.on("join-lobby", () => {
    Logger.qa("join-lobby", player.name)
    if (!player.currentGame) { return }
    player.currentGame.joinLobby(player)
  })

  socket.on("lobby-did-not-exist", () => {
    Logger.qa("lobby-did-not-exist")
    if (!player.currentGame) { return }
    player.currentGame.handleLobbyDidNotExist(player)
  })


  socket.on("set-current-lobby-id", (data) => {
    Logger.qa("set-current-lobby-id", data)
    if (!player.currentGame || player.currentGame.currentLobbyID === data) { return }
    player.currentGame.setLobbyID(data, player)
  })

  socket.on("disconnecting", () => {
    Logger.qa("disconnecting", socket.id)
    queue.deQueue(socket.id)
    delete players[socket.id]
  })
});

httpServer.listen(3000, () => {
  console.log('morbba :--D')
});