import { Socket } from "socket.io"
import { Game } from "./game"

export class Player { // TODO REMOVE CURRENTGAME AFTER GAME ENDS
  name: string
  iconId: number
  summonerLevel: number
  rankData: {
    rank: string
    division: string
    lp: string
  }
  socket: Socket
  role: Player[] | undefined
  accepted: boolean
  currentGame: Game

  inGame: boolean
  clientOpen: boolean

  constructor(socket: Socket){
    this.socket = socket
  }

  public setInGame(value: boolean) {
    this.inGame = value
  }

  public setClientOpen(value: boolean) {
    this.clientOpen = value
  }

  public setName(value: string) {
    this.name = value
  }

  public setIconId(value: number) {
    this.iconId = value
  }

  public setSummonerLevel(value: number) {
    this.summonerLevel = value
  }

  public setRank(value: {rank: string, division: string, lp: string}) {
    this.rankData = value
  }

  public joinLobby(ID: number) {
    this.socket.emit("join-lobby", ID)
  }

  public createLobby() {
    this.socket.emit("create-lobby")
  }

  deQueue(){
    if (!this.role) { return }
    try {
      this.role.splice(this.role.indexOf(this), 1)
      this.role = undefined
    } catch (e) {
      console.log('cant deque:', e)
    }
  }
}