import 'dotenv/config'
import express, {  Request, Response } from 'express'
import cors from 'cors'
import CategoryRouter from './routes/categoryRoutes.js'
import uploadRouter from './routes/uploadRoutes.js'


const app = express()

// MIDDLEWARE
app.use(cors())
app.use(express.json({limit: "15mb"}));
app.use(express.urlencoded({extended: true, limit: "15mb"}))
   

const PORT = process.env.PORT || 3000;

//ROUTES
app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live')
})
app.use('/api/categories', CategoryRouter)
app.use('/api/upload', uploadRouter)




app.listen(PORT, ()=> {
    console.log(`Server is running at http://localhost:${PORT}`)
})
