export function mutGoals (state, payload) {
  state.goals.push(payload);
}

export function mutPayment (state, payload) {
  const goal = JSON.stringify(payload.goal);
  const goalIndex = state.goals.findIndex(item => JSON.stringify(item) === goal)
  state.goals[goalIndex].weeks[payload.index].status = payload.status;
}

export function mutAnimation (state, payload) {
  state.animation = payload
}

export function mutDeferredPrompt (state, payload) {
  state.deferredPrompt = payload
}

export function mutRemoveGoal (state, goalName) {
  const goals = state.goals;
  const goalIndex = state.goals.findIndex(item => item.name === goalName)
  if (goalIndex != -1) {
    state.goals.splice(goalIndex, 1)
  }
}