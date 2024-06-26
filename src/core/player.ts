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
  currentGame: Game
  
  accepted: boolean = false
  ready: boolean = false
  inGame: boolean = false
  inLobby: boolean = false
  inGameLobby: boolean = false
  currentLobbyName: string
  clientOpen: boolean = false
  autoJoining: boolean = false

  constructor(socket: Socket){
    this.socket = socket
  }

  public checkAvailability(): boolean {
    if (this.inGame || this.inLobby || !this.clientOpen) { return false }
    return true
  }

  public setInGame(value: boolean) {
    this.inGame = value
    if (value) { this.setReady(false) }
    this.emitGame()
  }

  public setClientOpen(value: boolean) {
    this.clientOpen = value
    if (!value) { this.setReady(false) }
    this.emitGame()
  }

  public setName(value: string) {
    this.name = value
  }

  public setInLobby(value: boolean) {
    this.inLobby = value
    if (value) { this.setReady(false) }
    this.emitGame()
  }

  public setReady(value: boolean) {
    if (!this.checkAvailability() && value) { return }
    this.ready = value
    this.emitGame()
    if (!this.currentGame) { return }
    this.currentGame.autoJoinLobbyCheck()
    this.emitGame()
  }

  public setCurrentLobbyName(value: string) {
    this.currentLobbyName = value
    if (this.currentGame) {
      if (value === this.currentGame.lobbyName) {
        this.inGameLobby = true
        this.currentGame.updatePlayerGameStates()
        return
      }
      this.inGameLobby = false
    }
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
    this.socket.emit("create-lobby", this.currentGame.lobbyName)
  }

  private emitGame() {
    if (!this.currentGame) { return }
    this.currentGame.updatePlayerGameStates()
  }

  deQueue(){
    this.accepted = false
    if (!this.role) { return }
    try {
      this.role.splice(this.role.indexOf(this), 1)
      this.role = undefined
    } catch (e) {
      console.log('cant deque:', e)
    }
  }
}