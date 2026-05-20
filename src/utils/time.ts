export function unixSeconds(date = new Date()) {
  return Math.floor(date.getTime() / 1000)
}
