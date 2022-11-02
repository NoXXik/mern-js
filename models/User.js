const {Schema, model, ObjectId} = require("mongoose")
// import mongoose from "mongoose"
// export const ObjectId = mongoose.Types.ObjectId

const User = new Schema({
    name: {type: String, required: true},
    surname: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true, unique: false},
    diskSpace: {type: Number, default: 1024**3*10},
    usedSpace: {type: Number, default: 0},
    avatar: {type: String, default: ''},
    files: [{type: Schema.Types.ObjectId, ref:'File'}]
})

module.exports = model("User", User)