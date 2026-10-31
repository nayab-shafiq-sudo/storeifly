import 'dotenv/config'
import express, {  Request, Response } from 'express'
import cors from 'cors'
import CategoryRouter from './routes/categoryRoutes.js'
import uploadRouter from './routes/uploadRoutes.js'
import storeRouter from './routes/storeRoutes.js'
import productRouter from './routes/productRoutes.js'
import orderRouter from './routes/orderRoutes.js'
import analyticsRouter from './routes/analyticsRoutes.js'


const app = express()

// MIDDLEWARE
app.use(cors({
    origin: ["http://localhost:5173", "https://full-stack-storeifly-client.vercel.app"],
    credentials: true,
}))
app.use(express.json({limit: "15mb"}));
app.use(express.urlencoded({extended: true, limit: "15mb"}))
   

const PORT = process.env.PORT || 3000;

//ROUTES
app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live')
})
app.use('/api/categories', CategoryRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/stores', storeRouter);
app.use('/api/products', productRouter);
app.use('/api/orders', orderRouter);
app.use('/api/analytics', analyticsRouter);


// app.listen(PORT, ()=> {
//     console.log(`Server is running at http://localhost:${PORT}`)
// })

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`)
    })
}

export default app