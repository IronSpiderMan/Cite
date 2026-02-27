export type AnnotationMode = 'word' | 'sentence' | 'paragraph'

export interface TextSelector {
  kind: 'text'
  mode: AnnotationMode
  p: number
  start: number
  end: number
  quote: string
}

export interface Annotation {
  id: number
  item_id: number
  content: string | null
  selector: string
  color: string | null
  created_at: string
}

export interface Item {
  id: number
  url: string
  title: string
  description: string
  content: string
  content_format?: 'html' | 'markdown' | 'text'
  snapshot_path: string | null
  is_favorite: number
  created_at: string
}

export interface DbTag {
  id: number
  name: string
  color: string | null
}

export interface DbCollection {
  id: number
  name: string
  created_at: string
}
