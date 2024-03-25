import { Game, QueueState } from "./types";

const roles = {
  top: [],
  jungle: [],
  mid: [],
  adc: [],
  support: []
}

export const INITIAL_QUEUE_STATE: QueueState = {
  ...roles,
  fill: []
}

export const INITIAL_GAME = {
  name: "freakszn",
  teams: {
    blue: { ...roles },
    red: { ...roles },
  },
} as any as Game