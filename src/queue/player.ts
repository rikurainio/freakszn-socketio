import { Socket } from "socket.io"

export class Player {
  name: string
  socket: Socket
  role: Player[]
  accepted: boolean

  constructor(role: Player[]){
    this.role = role
  }

  deQueue(){
    try {
      this.role.splice(this.role.indexOf(this), 1)
    } catch (e) {
      console.log('cant deque:', e)
    }
  }
}