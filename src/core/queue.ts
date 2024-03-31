import { Server } from "socket.io"
import { INITIAL_GAME, INITIAL_QUEUE_STATE } from "../lib/constants"
import { GameRole, Game as GameType, QueueState, Role, Side } from "../lib/types"
import { QueuePop } from "./quePop"
import { Player } from "./player"
import { Game } from "./game"
import { io } from "socket.io-client"

export class Queue {
  state: QueueState = INITIAL_QUEUE_STATE
  game: GameType = INITIAL_GAME
  games: Record<string, Game>
  
  gameStarted: boolean = false
  isQueuePopped: boolean = false
  queuePopTimer = () => { return this.qp?.timer }
  queuePopTimerInterval: NodeJS.Timeout | undefined
  players: Record<string, Player>
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
    this.state[role].push(this.players[name])
    this.players[name].role = this.state[role]
    this.canFormMatch()
    this.emitState()
  }
  public deQueue(id: string){
    if(!id){ return }
    this.players[id]?.deQueue()
    this.emitState()
  }
  public accept(id: string){
    if(this.players[id].role === undefined){ return }
    this.players[id].accepted = true
    
    /** Create match if everyone accepted */
    if(this.qp && this.qp.checkAccepts()){
      this.formMatch() 
      this.emitState()
    }
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
        this.qp = undefined
        this.isQueuePopped = false
        clearInterval(this.queuePopTimerInterval)
        this.emitState()
        return
      }
      this.qp.timer--
      console.log("pop timer:", this.qp.timer)
      this.emitState()
    }, 1000)
  }

  private handleQueuePopDecline(id: string){
    this.isQueuePopped = false
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

    const newGame = new Game()

    for(const role of Object.keys(this.qp.state)){
      if(role === "fill"){ continue }
      for(const team of Math.floor(Math.random() * 2) === 1 ? ["blue", "red"] : ["red", "blue"]){
        if(this.qp.state[role as Role].length === 0){
          const fillSelectIndex = Math.floor(Math.random() * this.qp.state['fill'].length)
          this.game.teams[team as Side][role as GameRole] = this.qp.state['fill'].splice(fillSelectIndex, 1)[0]
          continue
        }
        const selectIndex = Math.floor(Math.random() * this.qp.state[role as Role].length)
        this.game.teams[team as Side][role as GameRole] = this.qp.state[role as Role].splice(selectIndex ,1)[0]
      }
    }
    this.isQueuePopped = false
    newGame.setPlayers(this.game)
    newGame.setPlayerGames(this.game)
    console.log("Match formed successfully")

    this.emitGame()
  }
  private queuePop(){
    if(this.isQueuePopped){ return }
    this.isQueuePopped = true
    this.qp = new QueuePop(this.getQueuePopMembers())
    this.startQueuePopTimer()
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
        iconId: 0
      }
      partialPlayer["name"] = player.name
      partialPlayer["iconId"] = player.iconId
      onlinePlayers.push(partialPlayer)
    })

    const statePlayers = {
      top: this.state.top.map((p: Player) => p.name),
      jungle: this.state.jungle.map((p: Player) => p.name),
      mid: this.state.mid.map((p: Player) => p.name),
      adc: this.state.adc.map((p: Player) => p.name),
      support: this.state.support.map((p: Player) => p.name),
      fill: this.state.fill.map((p: Player) => p.name)
    }

    const gamePlayers = {
      blue: {
        top: this.game.teams.blue.top.name,
        jungle: this.game.teams.blue.jungle.name,
        mid: this.game.teams.blue.mid.name,
        adc: this.game.teams.blue.adc.name,
        support: this.game.teams.blue.support.name
      },
      red: {
        top: this.game.teams.red.top.name,
        jungle: this.game.teams.red.jungle.name,
        mid: this.game.teams.red.mid.name,
        adc: this.game.teams.red.adc.name,
        support: this.game.teams.red.support.name
      }
    }

    this.io.in('freakszn').emit("state", {
      state: statePlayers, 
      game: gamePlayers,
      gameStarted: this.gameStarted,
      onlinePlayers: onlinePlayers
    })

  }
  private emitGame(){
    console.log('this.s', this.game.teams)
    const gamePlayers = {
      blue: {
        top: {
            name: this.game.teams.blue.top.name,
            IconId: this.game.teams.blue.top.iconId
        },
        jungle: {
            name: this.game.teams.blue.jungle.name,
            IconId: this.game.teams.blue.jungle.iconId
        },
        mid: {
            name: this.game.teams.blue.mid.name,
            IconId: this.game.teams.blue.mid.iconId
        },
        adc: {
            name: this.game.teams.blue.adc.name,
            IconId: this.game.teams.blue.adc.iconId
        },
        support: {
            name: this.game.teams.blue.support.name,
            IconId: this.game.teams.blue.support.iconId
        }
    },
    red: {
        top: {
            name: this.game.teams.red.top.name,
            IconId: this.game.teams.red.top.iconId
        },
        jungle: {
            name: this.game.teams.red.jungle.name,
            IconId: this.game.teams.red.jungle.iconId
        },
        mid: {
            name: this.game.teams.red.mid.name,
            IconId: this.game.teams.red.mid.iconId
        },
        adc: {
            name: this.game.teams.red.adc.name,
            IconId: this.game.teams.red.adc.iconId
        },
        support: {
            name: this.game.teams.red.support.name,
            IconId: this.game.teams.red.support.iconId
        }
    }
    }
      Object.values(this.game.teams).forEach((team) => {
        Object.values(team).forEach((player) => {
          player.socket.emit("game-start", gamePlayers)
        })
      })
  }

  
}