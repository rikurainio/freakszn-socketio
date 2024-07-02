import { Player } from "./player"
import { GameRole, Game as GameType, QueueState, Role, Side, Team } from "../lib/types"
import { INITIAL_GAME } from "../lib/constants"

export class Game {
    gameList: Record<string, Game>
    id: string
    currentLobbyID: number | undefined
    lobbyName: string | undefined
    players: Player[]
    joinPaused: boolean = false
    game: GameType = INITIAL_GAME
    autoJoining: boolean = false
    statusMessages: string[] = []
    draftUrl: string | undefined
    gameEnded: boolean = false

    constructor(gameList: Record<string, Game>, id: string) {
        this.gameList = gameList
        this.id = id
    }

    public initialize() {
        this.updateStatus("Game Created")
        this.createDraft()
    }

    public createDraft() {
        const options = {
          method: "POST",
          headers: {
            'Authorization': 'Bearer test'
          },
          body: JSON.stringify({ "blueName": "Blue", "redName": "Red"})
        }
    
        fetch("https://drafter.lol/api/room", options)
        .then(
          res => {
            if (!res.ok) { throw new Error(res.statusText) }
            return res.json()
          }
        )
        .then(data => {
          this.draftUrl = data.url
          this.updateStatus("Draft Created")
        }).catch(err => {console.log(err); this.updateStatus("Draft Creation Failed")})
      }


    public clearGame() {
        this.currentLobbyID = undefined
        this.players = []
        this.joinPaused = false
    }
    private deleteGame() {
        delete this.gameList[this.id]
    }

    public endOfGame(data: any) {
        if (!this.validateEndOfGameData(data) || this.gameEnded) { return }

        // TODO > DISCORD WEBHOOK TO POST END OF GAME SCREEN
        this.gameEnded = true
        this.updateStatus("Game Ended")

        setTimeout(() => {
            this.emitEndOfGame()
            this.deleteGame()
        }, 30000);
    }

    private emitEndOfGame() {
        this.players.forEach((player) => {
            player.socket.emit("game-end", {})
        })
    }

    private validateEndOfGameData(data: any): boolean {
        for (const team of data["teams"]) {
            for (const player of team["players"]) {
                if (this.players.find(p => p.name === player["summonerName"])) {
                    continue
                }
                return false
            }
        }
        return true
    }

    public setLobbyName(name: string) {
        this.lobbyName = name
    }

    public autoJoinLobbyCheck() {
        if (this.autoJoining) { return }
        const allReady = this.players.every((player) => player.ready)
        if (allReady) {
            this.autoJoinLobby()
        }   
    }

    public autoJoinLobby() {
        this.autoJoining = true
        this.players.forEach((player) => player.autoJoining = true)
        const delay = 2000
        let index = 0

        this.updateStatus("Auto Joining...")

        const lobbyJoinInterval = setInterval((): any => {
            if (this.joinPaused) { return }
            if (index === 9) { this.stopAutoJoinLobby(lobbyJoinInterval) }
            this.joinLobby(this.players[index])
            index++
            this.updatePlayerGameStates()
        }, delay)
    }

    private stopAutoJoinLobby(interval: NodeJS.Timeout) {
        clearInterval(interval)
        this.players.forEach((player) => player.autoJoining = false)
        this.autoJoining = false

        this.updateStatus("Auto Joining Stopped")
    }

    public setLobbyID(ID: number, player: Player) {
        this.currentLobbyID = ID
        this.joinPaused = false

        this.updateStatus(`${player.name} created the Lobby`)
    }

    public joinLobby(player: Player) {
        if (!this.currentLobbyID) { this.createLobby(player); this.joinPaused = true; return }
        player.joinLobby(this.currentLobbyID)
        this.updateStatus(`${player.name} joined the lobby`)
    }

    public createLobby(player: Player) {
        player.createLobby()
    }

    public setPlayerGames(game: GameType) {
        Object.values(game.teams).forEach((team) => {
            Object.values(team).forEach((player) => {
                player.currentGame = this
            })
        })
    }

    public setPlayers(game: GameType) {
        this.players = this.mergeTeams(game.teams)
    }

    public updatePlayerGameStates() {
        const parsedData = this.parseGameData()
        this.players.forEach((player) => {
            player.socket.emit("game-update", this.createEmitData(parsedData, player, this.statusMessages))
        })
    }

    private updateStatus(status: string) {
        if (status === this.statusMessages[this.statusMessages.length - 1]) { return }
        if (this.statusMessages.length >= 10) {this.statusMessages.shift()}
        const date = new Date()

        let seconds = String(date.getSeconds()).padStart(2, '0')
        let minutes = String(date.getMinutes()).padStart(2, '0')
        let hour = String(date.getHours()).padStart(2, '0')

        this.statusMessages.push(`[${hour}:${minutes}:${seconds}] ${status};${crypto.randomUUID().slice(0, 5)}`)

        this.updatePlayerGameStates()
    }

    private helper(player: Player): {} {
        const {name, tagline, iconId, summonerLevel, rankData, inGameLobby, ready, autoJoining} = player
        const availability = player.checkAvailability()
        return {name, tagline, iconId, summonerLevel, rankData, inGameLobby, availability, ready, autoJoining}
    }

    private parseGameData() {
        let gamePlayers = {
            "blue": {
                "top": {},
                "jungle": {},
                "mid": {},
                "adc": {},
                "support": {}
            },
            "red": {
                "top": {},
                "jungle": {},
                "mid": {},
                "adc": {},
                "support": {}
            },
            "me": {},
            "statusMessages": []
        }

        for(const team of Object.keys(gamePlayers)) {
            for (const role of ["top", "jungle", "mid", "adc", "support"]) {
                if (team === "blue") {
                    gamePlayers.blue[role as GameRole] = this.helper(this.game.teams[team as Side][role as GameRole])
                }
                if (team === "red") {
                    gamePlayers.red[role as GameRole] = this.helper(this.game.teams[team as Side][role as GameRole])
                }
            }
        }

        return gamePlayers
    }

    private createEmitData(parsedData: {
        "blue": {
            "top": {},
            "jungle": {},
            "mid": {},
            "adc": {},
            "support": {}
        },
        "red": {
            "top": {},
            "jungle": {},
            "mid": {},
            "adc": {},
            "support": {}
        },
        "me": {},
        "statusMessages": string[]
    }, player: Player, statusMessages: string[]) {
        parsedData.me = this.helper(player)
        parsedData.statusMessages = statusMessages
        return parsedData
    }
    
    public emitGame(){
        const parsedData = this.parseGameData()
        Object.values(this.game.teams).forEach((team) => {
            Object.values(team).forEach((player) => {
                player.socket.emit("game-start", this.createEmitData(parsedData, player, this.statusMessages))
            })
        })
    }

    public handleLobbyDidNotExist(player: Player) {
        this.currentLobbyID = undefined
        player.createLobby()

        this.updateStatus("Lobby Missing.. Creating New Lobby")
    }

    private mergeTeams(teamGroups: any): Player[] {
        const { blue, red } = teamGroups;
        const merged: Player[] = [];
        const positions = ['top', 'jungle', 'mid', 'adc', 'support'];
      
        positions.forEach(position => {
          merged.push(blue[position]);
          merged.push(red[position]);
        });
      
        return merged;
    }
}