import { Player } from "./player"
import { GameRole, Game as GameType, QueueState, Role, Side, Team } from "../lib/types"
import { INITIAL_GAME } from "../lib/constants"

export class Game {
    currentLobbyID: number | undefined
    lobbyName: string | undefined
    players: Player[]
    joinPaused: boolean = false
    game: GameType = INITIAL_GAME
    autoJoining: boolean = false


    public clearGame() {
        this.currentLobbyID = undefined
        this.players = []
        this.joinPaused = false
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

        const lobbyJoinInterval = setInterval((): any => {
            if (this.joinPaused) { return }
            if (index === 9) { this.stopAutoJoinLobby(lobbyJoinInterval) }
            this.joinLobby(this.players[index])
            index++
            this.emitGame()
        }, delay)
    }

    private stopAutoJoinLobby(interval: NodeJS.Timeout) {
        clearInterval(interval)
        this.players.forEach((player) => player.autoJoining = false)
        this.autoJoining = false
    }

    public setLobbyID(ID: number) {
        this.currentLobbyID = ID
        this.joinPaused = false
    }

    public joinLobby(player: Player) {
        if (!this.currentLobbyID) { this.createLobby(player); this.joinPaused = true; return }
        player.joinLobby(this.currentLobbyID)
    }

    public createLobby(player: Player) {
        player.createLobby()
    }

    public setPlayerGames(game: GameType) {
        console.log(game)
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
        this.players.forEach((player) => {
            player.socket.emit("game-update", )
        })
    }

    private helper(player: Player): {} {
        const {name, iconId, summonerLevel, rankData, inGameLobby, ready, autoJoining} = player
        const availability = player.checkAvailability()
        return {name, iconId, summonerLevel, rankData, inGameLobby, availability, ready, autoJoining}
    }
    
    public emitGame(){
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
            }
        }

        Object.keys(this.game.teams).forEach((team) => {
            Object.keys(this.game.teams.blue).forEach((role) => {
                gamePlayers[team as keyof typeof gamePlayers][role as GameRole] = this.helper(this.game.teams[team as Side][role as GameRole])
            })
        })

        Object.values(this.game.teams).forEach((team) => {
            Object.values(team).forEach((player) => {
                player.socket.emit("game-start", gamePlayers)
            })
        })
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