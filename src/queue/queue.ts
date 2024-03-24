import { Server } from "socket.io"
import { INITIAL_GAME, INITIAL_QUEUE_STATE } from "../lib/constants"
import { Game, QueueState, Role, Side } from "../lib/types"
import { QueuePop } from "./quePop"
import { Player } from "./player"

export class Queue {
  state: QueueState = INITIAL_QUEUE_STATE
  game: Game = INITIAL_GAME
  
  gameStarted: boolean = false
  isQueuePopped: boolean = false
  players: Record<string, Player>
  qp: QueuePop
  io: Server

  constructor(io: Server){
    this.io = io
  }

  public queue(jotain: any, role: Role){
    this.deQueue(jotain)
    this.state[role].push(this.players[jotain])
    this.players[jotain].role = this.state[role]
    this.canFormMatch()
    this.emitState()
  }
  public deQueue(jotain: any){
    this.players[jotain].deQueue()
    this.emitState()
  }
  public accept(jotain: any){
    this.players[jotain].accepted = true
    
    /** Create match if everyone accepted */
    if(this.qp.checkAccepts()){
      this.formMatch() 
      this.emitState()
    }
    this.emitState()
  }
  public decline(){

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
    this.qp.removeAccepts()
    for(const role of Object.keys(this.qp.state)){
      for(const team of Math.floor(Math.random() * 1) === 2 ? ["blue", "red"] : ["red", "blue"]){
        if(this.qp.state[role as Role].length === 0){
          const fillSelectIndex = Math.floor(Math.random() * this.qp.state[role as Role].length)
          this.game.teams[team as Side][role as Role] = this.qp.state['fill'].splice(fillSelectIndex, 1)
          continue
        }
        const selectIndex = Math.floor(Math.random() * this.qp.state[role as Role].length)
        this.game.teams[team as Side][role as Role] = this.qp.state[role as Role].splice(selectIndex ,1)
      }
    }
    this.isQueuePopped = false
  }
  private queuePop(){
    if(this.isQueuePopped){ return }
    this.isQueuePopped = true
    this.qp = new QueuePop(this.getQueuePopMembers())
    this.emitState()
  }
  private getQueuePopMembers(){
    const members: any = {}
    let memberCount = 0
    for(const role of Object.keys(this.state)){
      if(role !== 'fill'){
        const addedMemberCount = Math.min(role.length, 2)
        members[role] = this.state[role as Role].slice(0, addedMemberCount)
        memberCount += addedMemberCount
      }
    }
    members['fill'] = this.state['fill'].slice(0, 10-memberCount)
    return members
  }
  private emitState(){
    this.io.in('freakszn').emit("state", {
      state: this.state, 
      game: this.game, 
      gameStarted: this.gameStarted
    })
  }
}