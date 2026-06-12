#!/usr/bin/env node

const { spawn, spawnSync } = require('node:child_process')
const path = require('node:path')

const rootDir = path.resolve(__dirname, '..')
const args = process.argv.slice(2)
const isDevCommand = args[0] === 'dev'

function hasCommand(command) {
  const checker = process.platform === 'win32' ? 'where' : 'which'
  const result = spawnSync(checker, [command], { stdio: 'ignore' })
  return result.status === 0
}

function createDevEnv() {
  const env = {
    ...process.env,
    CARGO_INCREMENTAL: '1',
  }

  if (hasCommand('sccache')) {
    env.RUSTC_WRAPPER = 'sccache'
  }

  return env
}

const isWindows = process.platform === 'win32'
const command = isWindows ? path.join(__dirname, 'tauri-env.cmd') : 'pnpm'
const commandArgs = isWindows ? args : ['exec', 'tauri', ...args]
const spawnEnv = isDevCommand ? createDevEnv() : process.env

const child = isWindows
  ? spawn('cmd.exe', ['/d', '/s', '/c', command, ...commandArgs], {
      cwd: rootDir,
      stdio: 'inherit',
      env: spawnEnv,
    })
  : spawn(command, commandArgs, {
      cwd: rootDir,
      stdio: 'inherit',
      env: spawnEnv,
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
