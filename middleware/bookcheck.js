const DbConn = require("../helper/DbTransaction");

const checkBook = async (req, res, next) => {
  const data = req.body.data;
  const room = data.id_ruangan;
  const book_date = data.book_date;
  const time_start = data.time_start;
  const time_end = data.time_end;
  const Client = new DbConn();
  await Client.init();
  try {
    const isBooked = await Client.select(
      `
      SELECT
      id_ruangan,
      DATE_FORMAT(book_date, '%Y-%m-%d') as book_date,
      DATE_FORMAT(time_start, '%H:%i') as time_start,
      DATE_FORMAT(time_end, '%H:%i') as time_end
    FROM
      req_book
    WHERE
      id_ruangan = ?
    AND book_date = ?
    AND is_active = 'T'
    AND (
      (req_book.time_start < ? AND req_book.time_end > ?)
    ) ;
    `,
      [room, book_date, time_start, time_end]
    );
    if (isBooked[0].length > 0) {
      res.status(400).send({
        message: `${room} is booked`,
        booked: isBooked[0],
      });
    } else {
      next();
    }
  } catch (error) {
    res.status(500).send({
      message: error.message,
    });
  }
};

module.exports = checkBook;
