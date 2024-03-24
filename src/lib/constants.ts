import { QueueState } from "./types";

export const INITIAL_QUEUE_STATE: QueueState = {
  top: [],
  jungle: [],
  mid: [],
  adc: [],
  support: [],
  fill: []
}

export const INITIAL_GAME = {
  name: "freakszn",
  teams: {
    blue: { ...INITIAL_QUEUE_STATE },
    red: { ...INITIAL_QUEUE_STATE },
  },
}