//@clean up booking function
require("dotenv").config({ path: `.env.development` });
const moment = require("moment");
const NotificationManager = require("./NotificationManager");
const DbConn = require("./DbTransaction");
const convertTZ = require("./helper");

const BookingChores = {};

BookingChores.userPenalty = async function (usersId, client) {
  let now = new Date();
  if (process.env.MYSQLDB === "mrbapp") {
    now = convertTZ(now, "Asia/Jakarta");
  }
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

BookingChores.Penalty = async () => {
  const Client = new DbConn();
  const client = await Client.initConnection();
  const penUser = new Set(); // Using Set to automatically handle unique user ids
  try {
    await client.beginTransaction();
    const pen = await client.query(`
      SELECT
        id_book, id_user, id_ruangan, book_date, time_start, time_end, is_active, approval, check_in, check_out
      FROM
        req_book BOOK 
      WHERE
        TIMESTAMP(CONCAT( BOOK.book_date, ' ', BOOK.time_end )) + INTERVAL 15 MINUTE < CONVERT_TZ(NOW(), '+00:00', '+07:00')
        AND
        is_active = 'T'
        AND
        approval = 'approved'
        AND
        ((check_in = 'T' AND check_out = 'F') OR (check_in = 'F' AND check_out = 'F'))
      `);
    const penaltyUser = pen[0];

    if (penaltyUser.length === 0) {
      return "No user penalty";
    }

    penaltyUser.forEach((item) => {
      penUser.add(item.id_user);
    });

    let usersPen = [];

    penUser.forEach((item) => {
      usersPen.push(item);
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

    await client.commit();
    return "success add penalty";
    // const updateReqBook = Promise.all(promise);
  } catch (error) {
    await client.rollback();
    console.error(error);
  } finally {
    client.release();
  }
};

BookingChores.CleanUp = async () => {
  const Client = new DbConn();
  const client = await Client.initConnection();
  const idBook = new Set(); // Using Set to automatically handle unique user ids
  try {
    await client.beginTransaction();
    const expired = await client.query(`
      SELECT
        id_book, id_user, id_ruangan, book_date, time_start, time_end, is_active
      FROM
        req_book BOOK 
      WHERE
        TIMESTAMP(CONCAT( BOOK.book_date, ' ', BOOK.time_end )) + INTERVAL 15 MINUTE < CONVERT_TZ(NOW(), '+00:00', '+07:00')
        AND
        IS_ACTIVE = 'T'
      `);
    const expiredBook = expired[0];

    if (expiredBook.length === 0) {
      return "No expired booking, everything is clear";
    }

    expiredBook.forEach((item) => {
      idBook.add(item.id_book);
    });

    let bookId = [];

    idBook.forEach((item) => {
      bookId.push(item);
    });

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

setInterval(async () => {
  try {
    const penaltyRes = await BookingChores.Penalty();
    const result = await BookingChores.CleanUp();
    await NotificationManager.CleanUpCron();
    console.log(result, penaltyRes);
  } catch (error) {
    console.log(error);
  }
}, 60 * 1000);

// setInterval(() => {
//   console.log("SEND EMAIL");
// }, 5 * 60 * 1000);
