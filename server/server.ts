import 'dotenv/config'
import express, {  Request, Response } from 'express'
import cors from 'cors'
import CategoryRouter from './routes/categoryRoutes.js'


const app = express()

// MIDDLEWARE
app.use(cors())
app.use(express.json())


const PORT = process.env.PORT || 3000;

//ROUTES
app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live')
})
app.use('/api/categories', CategoryRouter)




app.listen(PORT, ()=> {
    console.log(`Server is running at http://localhost:${PORT}`)
})
