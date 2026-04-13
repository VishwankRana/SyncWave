export function getServerClockPayload(clientSentAtMs) {
  return {
    clientSentAtMs,
    serverReceivedAtMs: Date.now(),
    serverTransmitAtMs: Date.now(),
  }
}

function toFiniteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

export function buildScheduledPlaybackUpdate(currentState, command) {
  const now = Date.now()
  const scheduledLeadMs = 1200
  const normalizedState = {
    track: currentState?.track ?? null,
    status: currentState?.status ?? 'idle',
    startedAtMs: currentState?.startedAtMs ?? null,
    pausedAtMs: currentState?.pausedAtMs ?? null,
    positionMs: toFiniteNumber(currentState?.positionMs, 0),
    updatedAtMs: toFiniteNumber(currentState?.updatedAtMs, now),
    commandSeq: toFiniteNumber(currentState?.commandSeq, 0),
  }

  if (command.type === 'play') {
    return {
      ...normalizedState,
      status: 'playing',
      startedAtMs: now + scheduledLeadMs,
      pausedAtMs: null,
      positionMs: toFiniteNumber(command.positionMs, normalizedState.positionMs),
      updatedAtMs: now,
      commandSeq: normalizedState.commandSeq + 1,
    }
  }

  if (command.type === 'pause') {
    return {
      ...normalizedState,
      status: 'paused',
      pausedAtMs: now,
      updatedAtMs: now,
      commandSeq: normalizedState.commandSeq + 1,
    }
  }

  if (command.type === 'seek') {
    return {
      ...normalizedState,
      positionMs: toFiniteNumber(command.positionMs, 0),
      updatedAtMs: now,
      commandSeq: normalizedState.commandSeq + 1,
    }
  }

  return normalizedState
}
