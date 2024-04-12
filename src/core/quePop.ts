import { QueueState } from "../lib/types"
import { Player } from "./player"

export class QueuePop {
  public timer = 30
  state: QueueState = {
    top: [],
    jungle: [],
    mid: [],
    adc: [],
    support: [],
    fill: []
  }

  constructor(state: any){
    this.state = state
  }

  public removeQueues(){
    return Object
      .values(this.state)
      .forEach((pArr: Player[]) => pArr
      .forEach((p: Player) => p.deQueue()))
  }

  public removeAccepts(){
    return Object
      .values(this.state)
      .forEach((pArr: Player[]) => pArr
      .forEach((p: Player) => p.accepted = false))
  }

  public checkAccepts(){
    return Object
      .values(this.state)
      .every((r: Player[]) => r
      .every((p: Player) => p.accepted === true))
  }

  public dequeueUnaccepts(){
    return Object
      .values(this.state)
      .forEach((pArr: Player[]) => pArr
      .forEach((p: Player) => {if (!p.accepted) {p.deQueue()}}))
  }

  public emitQueuePop(){
    let data: any = {
      players: [],
      timer: this.timer
    }
    let temp: Player[] = []
    Object
      .values(this.state)
      .forEach((pArr: Player[]) => pArr
      .forEach((p: Player) => { data.players.push(this.helper(p)); temp.push(p) }))

    temp.forEach((player) => player.socket.emit("queue-pop", data))
  }

  public emitQueuePopUndefined(){
    Object
      .values(this.state)
      .forEach((pArr: Player[]) => pArr
      .forEach((p: Player) => { p.socket.emit("queue-pop", undefined) }))
  }

  private helper(player: Player): {} {
    const {name, iconId, accepted} = player
    return {name, iconId, accepted}
}
}