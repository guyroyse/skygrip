import express from 'express'

const app = express()
const port = 3000

app.use(express.json())

app.get('/', (req, res) => {
  res.send({
    server: 'Skygrip',
    version: '1.0.0'
  })
})

app.listen(port, () => console.log('Server is running on http://localhost:3000'))
