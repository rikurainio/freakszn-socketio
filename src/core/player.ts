import { Socket } from "socket.io"
import { Game } from "./game"
import { GameRole } from "../lib/types"

export class Player { // TODO REMOVE CURRENTGAME AFTER GAME ENDS
  name: string
  tagline: string
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
  duo: Player | undefined
  duoTag: string = ""
  roleInDuo: GameRole | undefined
  
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

  public removeDuo() {
    if (!this.duo) { return }

    const temp = this.duo
    this.duo = undefined

    temp.removeDuo()

    this.duo = undefined
    this.roleInDuo = undefined
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

  public setTagline(value: string) {
    this.tagline = value
  }

  public setInLobby(value: boolean) {
    this.inLobby = value
    if (value) { this.setReady(false) }
    if (!value) { this.inGameLobby = false }
    this.emitGame()
  }

  public openDraft() {
    if (!this.currentGame.draftUrl) { return; }

    this.socket.emit("open-draft", this.currentGame.draftUrl)
  }

  public endOfGame(data: any) {
    if (!this.currentGame) { return }
    this.currentGame.endOfGame(data)
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
    if (this.currentGame && value === this.currentGame.lobbyName) {
        this.inGameLobby = true
        this.currentGame.updatePlayerGameStates()
        return
    }
    this.inGameLobby = false
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

  public leaveQueue() {
    this.accepted = false
    if (!this.role) { return }
    try {
      this.role.splice(this.role.indexOf(this), 1)
      this.role = undefined
      this.duoTag = ""

      if (this.duo) {
        const temp = this.duo
        this.removeDuo()
        temp.deQueue()
      }

    } catch (e) {
      console.log('cant deque:', e)
    }
  }

  public deQueue(){
    this.accepted = false
    if (!this.role) { return }

    try {
      this.role.splice(this.role.indexOf(this), 1)
      this.role = undefined
      this.duoTag = ""

    } catch (e) {
      console.log('cant deque:', e)
    }
  }

  public deQueueDuo() {
    if (!this.duo) { return }

    this.duo.deQueue()
    this.removeDuo()
  }
}