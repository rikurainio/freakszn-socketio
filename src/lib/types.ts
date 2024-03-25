import { Player } from "../core/player"

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'fill'
export type GameRole = 'top' | 'jungle' | 'mid' | 'adc' | 'support'
export type QueueState = Record<Role, Player[]>
export type Team = Record<GameRole, Player>
export type Side = "blue" | "red"

export type Game = {
  name: string,
  teams: {
    blue: Team,
    red: Team
  },
}