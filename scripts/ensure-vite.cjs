#!/usr/bin/env node

const http = require('node:http')

const host = '127.0.0.1'
const port = 1420

function probeVite() {
  return new Promise((resolve) => {
    const request = http.get({ host, port, path: '/', timeout: 800 }, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        body += chunk
        if (body.length > 4096) {
          response.destroy()
        }
      })
      response.on('end', () => resolve(body))
    })

    request.on('timeout', () => {
      request.destroy()
      resolve(null)
    })
    request.on('error', () => resolve(null))
  })
}

async function main() {
  const body = await probeVite()
  if (body && (body.includes('/src/main') || body.includes('@vite/client'))) {
    console.log(`Using existing Vite dev server at http://${host}:${port}/`)
    return
  }

  console.error(`Vite dev server is not running on http://${host}:${port}/`)
  console.error('Start it in another terminal first: pnpm dev')
  process.exit(1)
}

void main()
