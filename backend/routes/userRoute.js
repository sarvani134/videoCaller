import express from "express"
import { aiChat, saveUser } from "../controllers/userController.js"
import { checkJwt } from "../middlewares/authMiddleware.js"
import { receiveImage } from "../middlewares/receiveImage.js"

export const router = express.Router()

router.post("/profile", checkJwt, saveUser)
router.post("/aiChat",checkJwt,receiveImage,aiChat)