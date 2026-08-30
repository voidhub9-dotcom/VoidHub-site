export interface GameEntry {
  id: string
  name: string
  script: string
  status: string
}

export const emptyGame: GameEntry = {
  id: '',
  name: '',
  script: '',
  status: 'active'
}
