import { Player } from "./player"
import { Game as GameType, QueueState, Role, Side, Team } from "../lib/types"

export class Game {
    currentLobbyID: number | undefined
    players: Player[]
    joinPaused: boolean = false


    public clearGame() {
        this.currentLobbyID = undefined
        this.players = []
        this.joinPaused = false
    }

    public autoJoinLobby() {
        const delay = 2000
        let index = 0

        const lobbyJoinInterval = setInterval((): any => {
            if (this.joinPaused) { return }
            if (index >= 10) {clearInterval(lobbyJoinInterval)}
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