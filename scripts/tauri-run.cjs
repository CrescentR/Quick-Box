#!/usr/bin/env node

const { spawn } = require('node:child_process')
const path = require('node:path')

const rootDir = path.resolve(__dirname, '..')
const args = process.argv.slice(2)

const isWindows = process.platform === 'win32'
const command = isWindows ? path.join(__dirname, 'tauri-env.cmd') : 'pnpm'
const commandArgs = isWindows ? args : ['exec', 'tauri', ...args]

const child = spawn(command, commandArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: isWindows,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})

child.on('error', (error) => {
  console.error(error.message)
  process.exit(1)
})
