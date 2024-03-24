import { Player } from "../queue/player"

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'fill'
export type QueueState = Record<Role, Player[]>
export type Team = QueueState
export type Side = "blue" | "red"

export type Game = {
  name: string,
  teams: {
    blue: Team,
    red: Team
  },
}