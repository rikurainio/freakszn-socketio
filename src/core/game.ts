import { Player } from "./player"
import { GameRole, Game as GameType, QueueState, Role, Side, Team } from "../lib/types"
import { INITIAL_GAME } from "../lib/constants"

export class Game {
    currentLobbyID: number | undefined
    lobbyName: string | undefined
    players: Player[]
    joinPaused: boolean = false
    game: GameType = INITIAL_GAME


    public clearGame() {
        this.currentLobbyID = undefined
        this.players = []
        this.joinPaused = false
    }

    public setLobbyName(name: string) {
        this.lobbyName = name
    }

    public autoJoinLobby() {
        const delay = 2000
        let index = 0

        const lobbyJoinInterval = setInterval((): any => {
            if (this.joinPaused) { return }
            if (index === 9) {clearInterval(lobbyJoinInterval)}
            this.joinLobby(this.players[index])
            index++
        }, delay)
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
        const {name, iconId, summonerLevel, rankData, inGameLobby} = player
        const availability = player.checkAvailability()
        return {name, iconId, summonerLevel, rankData, inGameLobby, availability}
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