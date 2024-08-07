import { Server } from "socket.io"
import { INITIAL_GAME, INITIAL_QUEUE_STATE } from "../lib/constants"
import { GameRole, Game as GameType, QueueState, Role, Side } from "../lib/types"
import { QueuePop } from "./quePop"
import { Player } from "./player"
import { Game } from "./game"
import { io } from "socket.io-client"

export class Queue {
  state: QueueState = INITIAL_QUEUE_STATE
  games: Record<string, Game>
  
  gameStarted: boolean = false
  isQueuePopped: boolean = false
  queuePopTimer = () => { return this.qp?.timer }
  queuePopTimerInterval: NodeJS.Timeout | undefined
  players: Record<string, Player>
  duoTags: string[] = ["Krug", "Raptor", "Gromp", "Wolf", "Brambleback", "Sentinel", "Minion", "Herald", "Baron", "Dragon"]
  takenDuoTags: string[] = []
  qp: QueuePop | undefined
  io: Server

  constructor(io: Server, players: Record<string, Player>, games:Record<string, Game>){
    this.io = io
    this.players = players
    this.games = games
  }

  /** 
   * @param id id of the socket
   * @param role role to queue to
   * @example queues id "1" to jungle
   * queue("1", "jungle")
   */
  public queue(name: string, role: Role){
    if (this.isQueuePopped) { return }
    this.deQueue(name)
    if (this.players[name].duo) { this.players[name].deQueueDuo()}
    this.state[role].push(this.players[name])
    this.players[name].role = this.state[role]
    this.canFormMatch()
    this.emitState()
  }
  public queueDuo(player1Id: string, player2Id: string, player1Role: Role, player2Role: Role){
    if (this.isQueuePopped || !this.checkRoomForDuo(player1Role, player2Role)) { return }

    const duoTag = this.getRandomDuoTag()

    this.deQueue(player1Id)
    this.deQueue(player2Id)

    this.players[player1Id].duoTag = duoTag
    this.players[player2Id].duoTag = duoTag

    this.state[player1Role].push(this.players[player1Id])
    this.players[player1Id].role = this.state[player1Role]

    this.state[player2Role].push(this.players[player2Id])
    this.players[player2Id].role = this.state[player2Role]

    this.canFormMatch()
    this.emitState()

  }
  private getRandomDuoTag(): string {
    let randomIndex = Math.floor(Math.random() * this.duoTags.length);
    if (this.takenDuoTags.includes(this.duoTags[randomIndex])) {
      return this.getRandomDuoTag();
    }
    this.takenDuoTags.push(this.duoTags[randomIndex]);
    return this.duoTags[randomIndex];
  }
  private removeTakenDuoTag(player: Player) {
    this.takenDuoTags.splice(this.takenDuoTags.indexOf(player.duoTag), 1)
  }
  public deQueue(id: string){
    if(!id){ return }
    if(this.players[id].duoTag !== "") {this.removeTakenDuoTag(this.players[id])}
    this.players[id]?.deQueue()
    this.emitState()
  }
  public leaveQueue(id: string) {
    if(!id){ return }
    this.players[id]?.leaveQueue()
    this.emitState()
  }
  public accept(id: string){
    if(this.players[id].role === undefined || !this.qp){ return }
    this.players[id].accepted = true
    
    /** Create match if everyone accepted */
    if(this.qp && this.qp.checkAccepts()){
      this.formMatch() 
      this.emitState()
      return
    }
    this.qp.emitQueuePop()
    this.emitState()
  }
  public decline(id: string){
    this.deQueue(id)
    this.handleQueuePopDecline(id)
    this.emitState()
  }

  private startQueuePopTimer() {
    this.queuePopTimerInterval = setInterval(() => {
      if (!this.qp) { return }
      if (this.qp.timer <= 0) {
        this.qp.dequeueUnaccepts()
        this.qp.emitQueuePopUndefined()
        this.qp = undefined
        this.isQueuePopped = false
        clearInterval(this.queuePopTimerInterval)
        this.emitState()
        return
      }
      this.qp.timer--
      console.log("pop timer:", this.qp.timer)
      this.qp.emitQueuePop()
      this.emitState()
    }, 1000)
  }

  private checkRoomForDuo(player1Role: Role, player2Role: Role) {
    let sum = 0;
    for (const role of Object.keys(this.state)) {
      if (role === 'fill') {
        sum += this.state.fill.length;
      } else {
        sum += Math.min(this.state[role as Role].length, 2);
      }
    }
    if (sum >= 9) {
      return false
    }
    return this.state[player1Role].length <= 1 && this.state[player2Role].length <= 1
  }

  private handleQueuePopDecline(id: string){
    this.isQueuePopped = false
    this.qp?.emitQueuePopUndefined()
    this.qp = undefined
    clearInterval(this.queuePopTimerInterval)
  }

  private stopQueuePopTimer(){
    clearInterval(this.queuePopTimerInterval)
  }

  private canFormMatch(){
    let sum = 0;
    for (const role of Object.keys(this.state)) {
      if (role === 'fill') {
        sum += this.state.fill.length;
      } else {
        sum += Math.min(this.state[role as Role].length, 2);
      }
    }

    if(sum >= 10){
      this.queuePop()
    }
  }
  private formMatch(){
    if (!this.qp) { return }
    this.stopQueuePopTimer()
    this.qp.removeAccepts()
    this.qp.removeQueues()

    const newGameId = crypto.randomUUID()
    const newGame = new Game(this.games, newGameId)
    this.games[newGameId] = newGame

    for(const role of Object.keys(this.qp.state)){
      if(role === "fill"){ continue }

      for(const team of Math.floor(Math.random() * 2) === 1 ? ["blue", "red"] : ["red", "blue"]){

        if(this.qp.state[role as Role].length === 0 && this.games[newGameId].game.teams[team as Side][role as GameRole]?.name === undefined){
          const fillSelectIndex = Math.floor(Math.random() * this.qp.state['fill'].length)
          this.games[newGameId].game.teams[team as Side][role as GameRole] = this.qp.state['fill'].splice(fillSelectIndex, 1)[0]
          continue
        }

        if (this.qp.state[role as Role].length === 0) { continue }


        const selectIndex = Math.floor(Math.random() * this.qp.state[role as Role].length)
        const selectedPlayer = this.qp.state[role as Role].splice(selectIndex ,1)[0]
        this.games[newGameId].game.teams[team as Side][role as GameRole] = selectedPlayer

        if ( selectedPlayer.duo ) {
          const duoPlayer = selectedPlayer.duo
          for(let i=0; i<this.qp.state[duoPlayer.roleInDuo as Role].length; i++) {
              if ( this.qp.state[duoPlayer.roleInDuo as Role][i] === duoPlayer) {
                  this.qp.state[duoPlayer.roleInDuo as Role].splice(i, 1)
                  break
              }
          }
          this.games[newGameId].game.teams[team as Side][duoPlayer.roleInDuo as GameRole] = duoPlayer
        }


      }
    }
    this.isQueuePopped = false
    this.qp.emitQueuePopUndefined()
    this.qp = undefined
    newGame.setLobbyName("freakszn-" + newGameId)
    newGame.setPlayers(this.games[newGameId].game)
    newGame.setPlayerGames(this.games[newGameId].game)

    newGame.initialize()
    newGame.emitGame()
    
    console.log("Match formed successfully")
  }
  private queuePop(){
    if(this.isQueuePopped){ return }
    this.isQueuePopped = true
    this.qp = new QueuePop(this.getQueuePopMembers())
    this.startQueuePopTimer()
    this.qp.emitQueuePop()
    this.emitState()
  }
  private getQueuePopMembers(){
    const members: any = {}
    let memberCount = 0
    for(const role of Object.keys(this.state)){
      if(role !== 'fill'){
        const addedMemberCount = Math.min(this.state[role as Role].length, 2)
        members[role] = this.state[role as Role].slice(0, addedMemberCount)
        memberCount += addedMemberCount
      }
    }
    members['fill'] = this.state['fill'].slice(0, 10)
    return members
  }
  public mockAcceptAll(){
    Object.keys(this.players).forEach((id: string) => {
      this.accept(id)
    })
  }

  public emitState(){


    const onlinePlayers: object[] = []

    Object.values(this.players).forEach((player) => {
      const partialPlayer = {
        name: "",
        tagline: "",
        iconId: 0,
        summonerLevel: 0
      }
      partialPlayer["name"] = player.name
      partialPlayer["tagline"] = player.tagline
      partialPlayer["iconId"] = player.iconId
      partialPlayer["summonerLevel"] = player.summonerLevel
      onlinePlayers.push(partialPlayer)
    })

    const statePlayers = {
      top: this.state.top.map((p: Player) => ({name: p.name, duoTag: p.duoTag})),
      jungle: this.state.jungle.map((p: Player) => ({name: p.name, duoTag: p.duoTag})),
      mid: this.state.mid.map((p: Player) => ({name: p.name, duoTag: p.duoTag})),
      adc: this.state.adc.map((p: Player) => ({name: p.name, duoTag: p.duoTag})),
      support: this.state.support.map((p: Player) => ({name: p.name, duoTag: p.duoTag})),
      fill: this.state.fill.map((p: Player) => ({name: p.name, duoTag: p.duoTag}))
    }

    this.io.in('freakszn').emit("state", {
      state: statePlayers, 
      gameStarted: this.gameStarted,
      onlinePlayers: onlinePlayers,
      isQueuePopped: this.isQueuePopped
    })

  }
  

  
}