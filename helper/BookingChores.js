//@clean up booking function
require("dotenv").config({ path: `.env.development` });
const moment = require("moment");
const NotificationManager = require("./NotificationManager");
const DbConn = require("./DbTransaction");

const BookingChores = {};

BookingChores.userPenalty = async function (usersId, client) {
  let now = new Date();
  now = moment(now).add(3, "days");
  try {
    console.log("usersId", usersId);
    if (usersId.length === 0) {
      return "Users clear";
    }
    const placeholder = usersId.map(() => "?").join(",");
    const penFormat = moment(now).format("YYYY-M-D HH:mm:ss");
    const setCounter = await client.query(
      `UPDATE mst_user 
      SET penalty_ctr = CASE 
        WHEN penalty_ctr >= 3 THEN 0 
        ELSE penalty_ctr + 1 
      END
      WHERE id_user IN (${placeholder})`,
      usersId
    );
    const setPenalty = await client.query(
      `UPDATE mst_user SET penalty_until = ?
      WHERE penalty_ctr >= 3 AND id_user IN (${placeholder})`,
      [penFormat, usersId]
    );
    return `Penalty: ${usersId.join(",")}`;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

BookingChores.CleanUp = async () => {
  const Client = new DbConn();
  const client = await Client.initConnection();
  const penUser = new Set(); // Using Set to automatically handle unique user ids
  const idBook = new Set();
  try {
    await client.beginTransaction();
    const res = await client.query(`
      SELECT
        id_book, id_user, id_ruangan, book_date, time_start, time_end, is_active
      FROM
        req_book BOOK 
      WHERE
        TIMESTAMP(CONCAT( BOOK.book_date, ' ', BOOK.time_end )) + INTERVAL 15 MINUTE < CONVERT_TZ(NOW(), '+00:00', '+07:00')
        AND
        IS_ACTIVE = 'T'
        AND
        ((check_in = 'T' AND check_out = 'F') OR (check_in = 'F' AND check_out = 'F'))
      `);
    const expiredBook = res[0];
    if (expiredBook.length === 0) {
      return "No expired booking, everything is clear";
    }
    expiredBook.forEach((item) => {
      idBook.add(item.id_book);
      penUser.add(item.id_user);
    });
    let usersPen = [];
    let bookId = [];
    penUser.forEach((item) => {
      usersPen.push(item);
    });
    idBook.forEach((item) => {
      bookId.push(item);
    });

    const uPenHolder = usersPen.map(() => "?").join(",");
    const resuser = await client.query(
      `SELECT id_user, penalty_until FROM mst_user
      WHERE id_user IN (${uPenHolder})
      AND 
      penalty_until IS null`,
      [usersPen.join(",")]
    );
    let userPen = resuser[0].map((item) => item.id_user);

    await BookingChores.userPenalty(userPen, client);

    const bIdHolder = bookId.map(() => "?").join(",");
    const resUpBook = await client.query(
      `UPDATE req_book SET is_active = 'F', approval = 'finished'
      WHERE TIMESTAMP(CONCAT( book_date, ' ', time_end )) + INTERVAL 15 MINUTE < CONVERT_TZ(NOW(), '+00:00', '+07:00')
      AND
      id_book IN (${bIdHolder})`,
      bookId
    );
    await client.commit();
    return "success cleaning booking";
    // const updateReqBook = Promise.all(promise);
  } catch (error) {
    await client.rollback();
    console.error(error);
  } finally {
    client.release();
  }
};

// BookingChores.EmailReminder = async () => {
//   const Client = new DbConn();
//   const client = await Client.initConnection();
//   try {

//   } catch (error) {

//   }
// }

setInterval(async () => {
  try {
    const result = await BookingChores.CleanUp();
    await NotificationManager.CleanUpCron();
    console.log(result);
  } catch (error) {
    console.log(error);
  }
}, 60 * 1000);

// setInterval(() => {
//   console.log("SEND EMAIL");
// }, 5 * 60 * 1000);
