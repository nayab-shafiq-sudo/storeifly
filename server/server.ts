import 'dotenv/config'
import express, {  Request, Response } from 'express'
import cors from 'cors'


const app = express()

// MIDDLEWARE
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live')
})

app.listen(PORT, ()=> {
    console.log(`Server is running at http://localhost:${PORT}`)
})
