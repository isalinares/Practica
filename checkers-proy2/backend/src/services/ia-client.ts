interface MoveRequest {
  board: number[][]
  player: 'red' | 'black'
  difficulty?: number
}

interface MoveResponse {
  from: [number, number]
  to: [number, number]
}

export async function getAiMove(board: number[][], player: 'red' | 'black'): Promise<MoveResponse> {
  const iaUrl = Bun.env.IA_SERVICE_URL || 'http://localhost:3001'

  const response = await fetch(`${iaUrl}/api/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ board, player, difficulty: 3 } satisfies MoveRequest),
  })

  if (!response.ok) {
    throw new Error(`IA service error: ${response.status}`)
  }

  return response.json()
}
