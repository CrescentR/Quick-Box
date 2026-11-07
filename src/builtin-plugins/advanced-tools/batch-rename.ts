import type { DirectoryFileItem, RenameOperation } from '../../api/file-tools-api'

export type RenamePreviewRow = RenameOperation & { unchanged: boolean }

export function formatRenameDate(value: string) {
  return value.replace(/-/g, '')
}

export function previewRename(
  files: DirectoryFileItem[],
  pattern: string,
  replacement: string,
  start: number,
  separator: string,
  includeDate: boolean,
  dateText: string,
) {
  let regex: RegExp | null = null
  try {
    regex = pattern ? new RegExp(pattern, 'g') : null
  } catch (error) {
    return {
      rows: [] as RenamePreviewRow[],
      report: error instanceof Error ? `正则无效：${error.message}` : '正则无效',
    }
  }

  const normalizedSeparator = separator || '_'
  const datePart = includeDate ? `${normalizedSeparator}${formatRenameDate(dateText)}` : ''
  const rows = files.map((file, index) => {
      const dot = file.name.lastIndexOf('.')
      const base = dot > 0 ? file.name.slice(0, dot) : file.name
      const ext = dot > 0 ? file.name.slice(dot) : ''
      const sequence = String(start + index).padStart(3, '0')
      const replaced = regex ? base.replace(regex, replacement) : base
      const newName = `${replaced}${datePart}${normalizedSeparator}${sequence}${ext}`
      return { old_name: file.name, new_name: newName, unchanged: file.name === newName }
    })
  const names = rows.map((row) => row.new_name)
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
  return {
    rows,
    report: duplicates.length
      ? `存在重复目标文件：${Array.from(new Set(duplicates)).join('、')}`
      : `预演通过，共 ${rows.length} 个文件`,
  }
}
