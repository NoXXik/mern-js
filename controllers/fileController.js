const fileService = require('../services/fileService')
const config = require('config')
const User = require('../models/User')
const File = require('../models/File')
const fs = require('fs')
const Uuid = require('uuid')
const jwt = require("jsonwebtoken");


class FileController {
    async createDir(req, res) {
        try {
            const {name, type, parent} = req.body
            const file = new File({name, type, parent, user: req.user.id})
            const parentFile = await File.findOne({_id: parent})
            if (!parentFile) {
                file.path = name
                await fileService.createDir(req, file)
            } else {
                console.log(parentFile)
                file.path = `${parentFile.path}/${file.name}`
                await fileService.createDir(req, file)
                parentFile.child.push(file._id)
                await parentFile.save()
            }
            await file.save()
            return res.json(file)
        } catch (e) {
            console.log(e)
            return res.status(400).json(e)
        }
    }

    async getFiles(req, res) {
        try {
            const {sort, search} = req.query
            let files
            switch (sort) {
                case 'name':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({name: 1})
                    break
                case 'type':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({type: 1})
                    break
                case 'date':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({date: 1})
                    break
                default: {
                    files = await File.find({user: req.user.id, parent: req.query.parent})
                    break
                }
            }
            if (search.length > 0) {
                files = files.filter(file => file.name.includes(search))
            }
            return res.json(files)
        } catch (e) {
            console.log(e)
            return res.status(500).json({message: 'Can not find files'})
        }
    }

    async fileUpload(req, res) {
        try {
            const file = req.files.file
            console.log(req.user)
            const parent = await File.findOne({user: req.user.id, _id: req.body.parent})
            const user = await User.findOne({_id: req.user.id})
            if (user.usedSpace + file.size > user.diskSpace) {
                return res.status(400).json({message: 'There no space on the disk'})
            }
            user.diskSpace = user.diskSpace + file.size
            let path;
            if (parent) {
                path = `${req.filePath}/${user._id}/${parent.path}/${file.name}`
            } else {
                path = `${req.filePath}/${user._id}/${file.name}`
            }
            if (fs.existsSync(path)) {
                return res.status(400).json({message: 'File already exist'})
            }
            file.mv(path)
            const type = file.name.split('.').pop()
            let filePath = file.name
            if (parent) {
                filePath = parent.path + '/' + file.name
            }
            const dbFile = new File({
                name: file.name,
                type: type,
                size: file.size,
                path: filePath,
                parent: parent ? parent._id : null,
                user: user._id,
            })

            await dbFile.save()
            await user.save()

            return res.status(200).json({dbFile})
        } catch (e) {
            console.log(e)
            return res.status(500).json({message: 'Error upload file'})
        }
    }

    async downloadFile(req, res) {
        try {
            const file = await File.findOne({user: req.user.id, _id: req.query.id})
            // const path = `${config.get('filePath')}/${req.user.id}/${file.path}`
            const path = fileService.getPath(req, file)
            if (fs.existsSync(path)) {
                return res.download(path)
            }
            return res.status(500).json({message: "File not found"})
        } catch (e) {
            console.log(e)
            return res.status(500).json({message: "Download error"})
        }
    }

    async deleteFile(req, res) {
        try {
            const file = await File.findOne({_id: req.query.id, user: req.user.id})
            if (!file) {
                return res.status(400).json({message: 'file not found'})
            }
            fileService.deleteFile(req, file)
            await file.remove()
            return res.json({message: 'File was deleted'})
        } catch (e) {
            console.log(e)
            return res.status(400).json({message: 'Dir is not empty'})
        }
    }

    async uploadAvatar(req, res) {
        try {
            const file = req.files.file
            const user = await User.findById(req.user.id)
            const avatarName = Uuid.v4() + '.jpg'
            file.mv(config.get('staticPath') + '/' + avatarName)
            user.avatar = avatarName
            await user.save()
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
            res.status(400).json({message: "Upload avatar error"})
        }
    }

    async deleteAvatar(req, res) {
        try {
            const user = await User.findById(req.user.id)
            fs.unlinkSync(config.get('staticPath') + '/' + user.avatar)
            user.avatar = null
            await user.save()
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
            res.status(400).json({message: "Delete avatar error"})
        }
    }
}


module.exports = new FileController()