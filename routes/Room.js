const RoomController = require("../controllers/RoomController");
const express = require("express");
const router = express.Router();

router.get("/", RoomController.getAllRoom);
router.get("/fas", RoomController.getAllRoomWithFac);
router.get("/avai", RoomController.getAvailableRoomWithParam);
router.post("/search-avail", RoomController.getAvailableRoom);

module.exports = router;
