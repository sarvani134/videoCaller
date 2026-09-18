import express from "express"
import { saveUser } from "../controllers/userController.js"
import { checkJwt } from "../middlewares/authMiddleware.js"

export const router = express.Router()

router.post("/profile", checkJwt, saveUser)