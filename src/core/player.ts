import { Socket } from "socket.io"

export class Player {
  name: string
  socket: Socket
  role: Player[]
  accepted: boolean

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

  public joinLobby(ID: number) {
    this.socket.emit("join-lobby", ID)
  }

  public createLobby() {
    this.socket.emit("create-lobby")
  }

  deQueue(){
    try {
      this.role.splice(this.role.indexOf(this), 1)
    } catch (e) {
      console.log('cant deque:', e)
    }
  }
}