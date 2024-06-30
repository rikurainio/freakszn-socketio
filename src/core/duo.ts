import { Player } from "./player";
import { GameRole} from "../lib/types"
import { Queue } from "./queue";

export class Duo {

    duoRequests: Record<string, {"duoName" : string, "myRole": GameRole, "duoRole": GameRole}> = {}
    queue: Queue
    players: Record<string, Player>

    constructor(players: Record<string, Player>, queue: Queue){
        this.players = players
        this.queue = queue
      }

    public duoRequest(player: Player, requestData: {"duoName" : string, "myRole": GameRole, "duoRole": GameRole}) {
        if (this.checkDuoRequests(this.getPlayerName(player)) || this.checkDuoRequests(requestData["duoName"])) { return; }
        this.duoRequests[this.getPlayerName(player)] = requestData

        this.getPlayerObjectByName(requestData["duoName"]).socket.emit("duo-request", this.helper(player))
    }

    public acceptDuo(player: Player) {
        const duoPlayer = this.getPlayerObjectByName(this.getDuoByValue(player) as string)
        
        duoPlayer.duo = player
        player.duo = duoPlayer
        duoPlayer.roleInDuo = this.duoRequests[this.getPlayerName(duoPlayer)].myRole
        player.roleInDuo = this.duoRequests[this.getPlayerName(duoPlayer)].duoRole

        this.queue.queueDuo(duoPlayer.socket.id, player.socket.id, this.duoRequests[this.getDuoByValue(player) as string].myRole, this.duoRequests[this.getDuoByValue(player) as string].duoRole)
        this.deleteDuoByValue(player)

        duoPlayer.socket.emit("duo-accept")
    }

    public declineDuo(player: Player) {
        const duo = this.getPlayerObjectByName(this.getDuoByValue(player) as string)
        duo?.socket.emit("duo-decline")
        this.deleteDuoByValue(player)
    }

    public cancelDuo(player: Player) {
        this.getPlayerObjectByName(this.getDuoByKey(player)["duoName"])?.socket.emit("duo-cancel")
        this.deleteDuoByKey(player)
    }

    private getPlayerName(player: Player) {
        return player.name+player.tagline
    }

    private getDuoByValue(player: Player) {
        for (const [key, val] of Object.entries(this.duoRequests)) {
            if (val["duoName"] === this.getPlayerName(player)) {
                return key
            }
        }
    }

    private getDuoByKey(player: Player) {
        return this.duoRequests[this.getPlayerName(player)]
    }

    private getPlayerObjectByName(name: string): Player {
        const player = Object.values(this.players).find(player => player.name+player.tagline === name)
        return player as Player
    }

    private checkDuoRequests(playerName: string) {
        const isKey = this.duoRequests.hasOwnProperty(playerName);
        let isValue = false

        for (const [key, val] of Object.entries(this.duoRequests)) {
            if (val["duoName"] === playerName) {
                isValue = true
            }
        }

        return isKey && isValue
    }

    private deleteDuoByValue(player: Player) {
        const duo = this.getDuoByValue(player)
        if (!duo) {return}
        delete this.duoRequests[duo];
    }

    private deleteDuoByKey(player: Player) {
        delete this.duoRequests[this.getPlayerName(player)]
    }

    private helper(player: Player): {} {
        const {name, tagline, iconId, summonerLevel, rankData} = player
        return {name, tagline, iconId, summonerLevel, rankData}
    }
}