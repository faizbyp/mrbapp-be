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
  const penalizedUsers = new Set();

  try {
    await client.beginTransaction();

    // Fetch penalizable bookings
    const time =
      process.env.MYSQLDB === "mrbapp" ? "CONVERT_TZ(NOW(), '+00:00', '+07:00')" : "NOW()";
    const penaltyQuery = `
      SELECT
        id_book, id_user, id_ruangan, book_date, time_start, time_end, is_active, approval, check_in, check_out
      FROM
        req_book BOOK 
      WHERE
        (
          TIMESTAMP(CONCAT(BOOK.book_date, ' ', BOOK.time_start)) + INTERVAL 15 MINUTE < ${time}
          AND is_active = 'T'
          AND approval = 'approved'
          AND check_in = 'F'
        )
        OR
        (
          TIMESTAMP(CONCAT(BOOK.book_date, ' ', BOOK.time_end)) + INTERVAL 15 MINUTE > ${time}
          AND is_active = 'T'
          AND approval = 'approved'
          AND check_out = 'F'
        );
    `;
    const penaltyResults = await client.query(penaltyQuery);
    const penaltyUserRecords = penaltyResults[0];

    // Update status of not checked-in bookings
    const updateStatusQuery = `
      WITH selected_books AS (
        SELECT id_book
        FROM req_book BOOK
        WHERE
          TIMESTAMP(CONCAT(BOOK.book_date, ' ', BOOK.time_start)) + INTERVAL 15 MINUTE < ${time}
          AND check_in = 'F'
          AND is_active = 'T'
      )
      UPDATE req_book
      SET approval = 'finished', is_active = 'F'
      WHERE id_book IN (SELECT id_book FROM selected_books);
    `;
    const updateStatusResults = await client.query(updateStatusQuery);
    console.log(
      `Not checked-in bookings updated to finished: ${updateStatusResults[0].affectedRows}`
    );

    if (penaltyUserRecords.length === 0) {
      return "No user penalty";
    }

    // Collect unique penalized user IDs
    penaltyUserRecords.forEach((record) => penalizedUsers.add(record.id_user));
    const uniqueUserIds = Array.from(penalizedUsers);

    // Fetch users eligible for penalty
    const userPlaceholders = uniqueUserIds.map(() => "?").join(",");
    const usersQuery = `
      SELECT id_user, penalty_until
      FROM mst_user
      WHERE id_user IN (${userPlaceholders})
    `;
    const usersResult = await client.query(usersQuery, uniqueUserIds);
    const usersToPenalize = usersResult[0].map((user) => user.id_user);

    // Apply penalties
    await BookingChores.userPenalty(usersToPenalize, client);

    await client.commit();
    return "Success: Penalty applied";
  } catch (error) {
    await client.rollback();
    console.error(error);
    throw error; // Ensure the error is propagated
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
