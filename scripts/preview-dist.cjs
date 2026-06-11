const http = require('http')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', 'dist')
const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 4173)

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
])

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404)
      res.end('Not found')
      return
    }

    res.writeHead(200, {
      'Content-Type': contentTypes.get(path.extname(filePath)) || 'application/octet-stream',
    })
    res.end(data)
  })
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${host}:${port}`)
  let pathname = decodeURIComponent(parsedUrl.pathname)

  if (pathname === '/') {
    pathname = '/index.html'
  }

  const filePath = path.resolve(root, `.${pathname}`)

  if (!filePath.startsWith(root)) {
    res.writeHead(403)
    res.end('Forbidden')
    return
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      sendFile(res, path.join(root, 'index.html'))
      return
    }

    sendFile(res, filePath)
  })
})

server.listen(port, host, () => {
  console.log(`QuickBox preview: http://${host}:${port}`)
})
