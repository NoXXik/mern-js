const Router = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/User");
const config = require("config")
const fileService = require('../services/fileService')
const File = require('../models/File')
const authMiddleware = require('../middleware/auth.middleware')

const router = Router()

router.post("/registration", async (req, res) => {
    try {
        const {name, surname, email, password} = req.body
        const dbUser = await User.findOne({email})
        if (dbUser) {
            return res.status(400).json({message: `User with email ${email} was created`})
        }
        const hashedPassword = await bcrypt.hash(password, 3)
        const user = new User({email: email, password: hashedPassword, name: name, surname: surname})
        await user.save()
        await fileService.createDir(req, new File({user:user.id, name: ''}))
        return res.status(200).json({message: "User was created"})
    } catch (e) {
        console.log(e)
        res.send({message: "Server error"})
    }
})

router.post("/login", async (req, res) => {
    try {
        const {email, password} = req.body
        const dbUser = await User.findOne({email})
        console.log(dbUser)
        if (!dbUser) {
            return res.status(400).json({message: `User with email ${email} not found`})
        }
        const isPassValid = bcrypt.compareSync(password, dbUser.password)
        if (!isPassValid) {
            return res.status(400).json({message: `Invalid password`})
        }
        const token = jwt.sign({id: dbUser.id}, config.get("secretKey"), {expiresIn: "1h"})
        return res.status(200).json({
            token,
            user: {
                id: dbUser.id,
                email: dbUser.email,
                diskSpace: dbUser.diskSpace,
                usedSpace: dbUser.usedSpace,
                avatar: dbUser.avatar
            }
        })
    } catch (e) {
        console.log(e)
        res.send({message: "Server error"})
    }
})


router.get('/auth', authMiddleware,
    async (req, res) => {
        try {
            const user = await User.findOne({_id: req.user.id})
            const token = jwt.sign({id: user.id}, config.get("secretKey"), {expiresIn: "1h"})
            return res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    diskSpace: user.diskSpace,
                    usedSpace: user.usedSpace,
                    avatar: user.avatar
                }
            })
        } catch (e) {
            console.log(e)
            res.send({message: "Server error"})
        }
    })


module.exports = router

