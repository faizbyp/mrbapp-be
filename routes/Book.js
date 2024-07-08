const BookReqController = require("../controllers/BookReqController");
const BookCheck = require("../middleware/bookcheck");
const express = require("express");
const router = express.Router();

router.post("/", BookCheck, BookReqController.createBook);
router.get("/", BookReqController.showAllBook);
router.get("/show", BookReqController.showBookbyUser);
router.get("/byroom", BookReqController.showBookbyRoom);
router.get("/:id_book", BookReqController.getBookById);
router.patch("/:id_book", BookReqController.editBook);
router.delete("/:id_book", BookReqController.cancelBook);
// http://localhost:5000/api/book/byroom?roomid=ROOM003

router.patch("/approval/:id_book", BookReqController.approval);

module.exports = router;
