#!/usr/bin/env node

const { spawn } = require('node:child_process')
const http = require('node:http')
const path = require('node:path')

const rootDir = path.resolve(__dirname, '..')
const host = '127.0.0.1'
const port = 1420

function readExistingServer() {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host,
        port,
        path: '/',
        timeout: 1200,
      },
      (response) => {
        let body = ''

        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          body += chunk
          if (body.length > 4096) {
            response.destroy()
          }
        })
        response.on('end', () => resolve(body))
      },
    )

    request.on('timeout', () => {
      request.destroy()
      resolve(null)
    })
    request.on('error', () => resolve(null))
  })
}

async function main() {
  const existingBody = await readExistingServer()

  if (existingBody) {
    if (existingBody.includes('/src/main') || existingBody.includes('@vite/client')) {
      console.log(`Reusing existing Vite dev server at http://${host}:${port}/`)
      return
    }

    console.error(`Port ${port} is already in use by another server.`)
    process.exit(1)
  }

  const viteArgs = ['dev', '--host', host, '--port', String(port), '--strictPort']
  const spawnOptions = { cwd: rootDir, stdio: 'inherit' }
  // Windows 上直接 spawn pnpm.cmd 在 Node 20+ 会触发 EINVAL，需经 cmd.exe 调用
  const child =
    process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', 'pnpm', ...viteArgs], spawnOptions)
      : spawn('pnpm', viteArgs, spawnOptions)

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      child.kill(signal)
    })
  }

  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })

  child.on('error', (error) => {
    console.error(error.message)
    process.exit(1)
  })
}

void main()
