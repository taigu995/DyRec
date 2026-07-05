const { createServer } = require('http')
const next = require('next')

const port = parseInt(process.env.PORT, 10) || 5000
const dev = false

console.log('[Server] Starting Next.js server...')
console.log('[Server] Directory:', __dirname)
console.log('[Server] Port:', port)

const app = next({ dev, dir: __dirname })

const handle = app.getRequestHandler()

app.prepare().then(() => {
  console.log('[Server] Next.js prepared successfully')
  
  const server = createServer((req, res) => {
    handle(req, res)
  })
  
  server.on('error', (err) => {
    console.error('[Server] Server error:', err)
  })
  
  server.on('listening', () => {
    console.log(`[Server] Server listening on port ${port}`)
    console.log(`[Server] Ready on http://localhost:${port}`)
  })
  
  server.listen(port, '0.0.0.0')
}).catch((err) => {
  console.error('[Server] Failed to prepare Next.js:', err)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled rejection at:', promise, 'reason:', reason)
})
