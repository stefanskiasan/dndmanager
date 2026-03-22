import { create } from 'zustand'
import type { Token, GameMode, GridPosition, TurnState, InitiativeEntry } from '@dndmanager/game-runtime'

interface GameStore {
  // State
  mode: GameMode
  tokens: Token[]
  selectedTokenId: string | null
  hoveredPosition: GridPosition | null
  initiative: InitiativeEntry[]
  turnOrder: string[]
  currentTurnIndex: number
  turn: TurnState | null
  round: number

  // Sync
  gameStateId: string | null

  // Map
  mapSize: [number, number]
  mapTiles: string

  // Actions
  setGameStateId: (id: string | null) => void
  setTokens: (tokens: Token[]) => void
  selectToken: (tokenId: string | null) => void
  setHoveredPosition: (pos: GridPosition | null) => void
  moveToken: (tokenId: string, position: GridPosition) => void
  setMode: (mode: GameMode) => void
  setInitiative: (initiative: InitiativeEntry[], turnOrder: string[]) => void
  setTurn: (turn: TurnState | null) => void
  setRound: (round: number) => void
  setMap: (size: [number, number], tiles: string) => void
  reset: () => void
}

const initialState = {
  mode: 'exploration' as GameMode,
  tokens: [] as Token[],
  selectedTokenId: null as string | null,
  hoveredPosition: null as GridPosition | null,
  initiative: [] as InitiativeEntry[],
  turnOrder: [] as string[],
  currentTurnIndex: -1,
  turn: null as TurnState | null,
  round: 0,
  gameStateId: null as string | null,
  mapSize: [10, 10] as [number, number],
  mapTiles: 'stone',
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setGameStateId: (id) => set({ gameStateId: id }),

  setTokens: (tokens) => set({ tokens }),

  selectToken: (tokenId) => set({ selectedTokenId: tokenId }),

  setHoveredPosition: (pos) => set({ hoveredPosition: pos }),

  moveToken: (tokenId, position) =>
    set((state) => ({
      tokens: state.tokens.map((t) =>
        t.id === tokenId ? { ...t, position } : t
      ),
    })),

  setMode: (mode) => set({ mode }),

  setInitiative: (initiative, turnOrder) =>
    set({ initiative, turnOrder }),

  setTurn: (turn) => set({ turn }),

  setRound: (round) => set({ round }),

  setMap: (size, tiles) => set({ mapSize: size, mapTiles: tiles }),

  reset: () => set(initialState),
}))
