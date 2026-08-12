// Arrow input during a transition is dropped rather than queued. Queuing it
// lets a held arrow key land the user on a world they never aimed at, with the
// curtain half faded.

export const IDLE = "idle"
export const COVERING = "covering"
export const REVEALING = "revealing"

export const INITIAL = { index: 0, pending: null, phase: IDLE }

export function nextNavigation(state, action, worldCount) {
  switch (action.type) {
    case "go": {
      if (state.phase !== IDLE) return state
      const target = state.index + action.delta
      if (target < 0 || target >= worldCount) return state
      return { index: state.index, pending: target, phase: COVERING }
    }

    case "covered": {
      if (state.phase !== COVERING) return state
      return { index: state.pending, pending: null, phase: REVEALING }
    }

    case "revealed": {
      if (state.phase !== REVEALING) return state
      return { index: state.index, pending: null, phase: IDLE }
    }

    default:
      return state
  }
}
