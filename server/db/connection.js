import mongoose from 'mongoose'
import { config } from '../config.js'

export async function connectDB() {
  try {
    await mongoose.connect(`${config.mongoUrl}/${config.mongoDbName}`)
    console.log('MongoDB connected (Mongoose)')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  } 
}