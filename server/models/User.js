    import mongoose from 'mongoose'

    const userSchema = new mongoose.Schema(
    {
        name: {
        type: String,
        required: true,
        trim: true,
        },
        email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        },
        password: {
        type: String,
        required: false, // Optional for OAuth users
        },
        googleId: {
        type: String,
        default: null,
        },
        avatar: {
        type: String,
        default: null,
        },
    },
    {
        timestamps: true,
    }
    )

    export const User = mongoose.model('User', userSchema)