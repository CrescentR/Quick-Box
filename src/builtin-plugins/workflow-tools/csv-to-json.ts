export function parseCsv(input: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (char === '"' && inQuotes && next === '"') {
      cell += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell)
  rows.push(row)
  return rows.filter((cells) => cells.some((value) => value.trim()))
}

export function csvToJson(input: string, delimiter: string, firstRowHeader: boolean) {
  const rows = parseCsv(input, delimiter)
  if (!rows.length) return '[]'
  if (!firstRowHeader) return JSON.stringify(rows, null, 2)
  const [headers, ...items] = rows
  const records = items.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header.trim() || `column_${index + 1}`, row[index] ?? ''])),
  )
  return JSON.stringify(records, null, 2)
}
