const { createServer } = require('http')
const next = require('next')

const port = parseInt(process.env.PORT, 10) || 5000
const dev = false

const app = next({ dev, dir: __dirname })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${port}`)
    handle(req, res, parsedUrl)
  }).listen(port, '0.0.0.0', (err) => {
    if (err) {
      console.error('Failed to start server:', err)
      process.exit(1)
    }
    console.log(`> Ready on http://localhost:${port}`)
  })
}).catch((err) => {
  console.error('Failed to prepare Next.js:', err)
  process.exit(1)
})
