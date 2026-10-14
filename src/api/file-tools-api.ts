import { invokeCommand } from './tauri-api'

export interface DirectoryFileItem {
  name: string
  path: string
  extension?: string
  size: number
}

export interface RenameOperation {
  old_name: string
  new_name: string
}

export interface RenameResultItem {
  old_name: string
  new_name: string
  ok: boolean
  message: string
}

export interface FileSearchResult {
  path: string
  line_number: number
  line_text: string
}

export interface ScreenColor {
  x: number
  y: number
  r: number
  g: number
  b: number
  hex: string
  rgb: string
}

export function listDirectoryFiles(directoryPath: string) {
  return invokeCommand<DirectoryFileItem[]>('list_directory_files', { directoryPath })
}

export function applyBatchRename(directoryPath: string, operations: RenameOperation[]) {
  return invokeCommand<RenameResultItem[]>('apply_batch_rename', { directoryPath, operations })
}

export interface FileSearchReport { results: FileSearchResult[]; scanned: number; skipped: number; cancelled: boolean; truncated: boolean }
export function searchFileContents(rootPath: string, query: string, patterns: string[], maxResults: number, jobId: string, excluded: string[]) {
  return invokeCommand<FileSearchReport>('search_file_contents', { rootPath, query, patterns, maxResults, jobId, excluded })
}
export const cancelFileSearch = (jobId: string) => invokeCommand<void>('cancel_file_search', { jobId })
export const fileSearchProgress = (jobId: string) => invokeCommand<{ scanned: number; skipped: number } | null>('file_search_progress', { jobId })

export function pickScreenColor() {
  return invokeCommand<ScreenColor>('pick_screen_color')
}
