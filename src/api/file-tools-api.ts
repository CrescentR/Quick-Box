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

export function searchFileContents(rootPath: string, query: string, patterns: string[], maxResults: number) {
  return invokeCommand<FileSearchResult[]>('search_file_contents', { rootPath, query, patterns, maxResults })
}

export function pickScreenColor() {
  return invokeCommand<ScreenColor>('pick_screen_color')
}
