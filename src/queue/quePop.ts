import { QueueState } from "../lib/types"
import { Player } from "./player"

export class QueuePop {
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
}