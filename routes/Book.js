const BookReqController = require("../controllers/BookReqController");
const BookCheck = require("../middleware/bookcheck");
const express = require("express");
const router = express.Router();

router.post("/", BookCheck, BookReqController.createBook);
router.get("/", BookReqController.showAllBook);
router.get("/show", BookReqController.showBookbyUser);
router.get("/byroom", BookReqController.showBookbyRoom);
router.get("/byid", BookReqController.getBookById);
router.patch("/", BookReqController.updateBook);
router.post("/cancel", BookReqController.cancelBook);
router.post("/edit", BookReqController.editBook);
// http://localhost:5000/api/book/byroom?roomid=ROOM003

module.exports = router;
