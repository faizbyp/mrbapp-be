require("dotenv").config({ path: `.env.development` });
const db = require("../config/db");
const DbConn = require("./DbTransaction");

const BookingChores = {
  CleanUp: async () => {
    const client = await db.getConnection();
    try {
      await client.beginTransaction();
      const res = await client.query(`SELECT
        *
      FROM
        ( SELECT id_book, id_user, id_ruangan, book_date, time_start, time_end, is_active FROM req_book ) BOOK 
      WHERE
        TIMESTAMP(CONCAT(BOOK.book_date, ' ', BOOK.time_end)) < CONVERT_TZ(NOW(), '+00:00', '+07:00') AND IS_ACTIVE = 'T'`);

      const expiredBook = res[0];
      const penUser = new Set(); // Using Set to automatically handle unique user ids

      expiredBook.forEach((item) => {
        penUser.add(item.id_user); // Adding user ids to the set
        // If you need to update the database here, uncomment the following lines:
        // promise.push(
        //   client.query("UPDATE req_book SET is_active = 0 WHERE id_book = ?", [
        //     item.id_book,
        //   ])
        // );
      });

      console.log([...penUser]); // Logging unique user ids

      await client.commit(); // Commit the transaction

      return "success";
    } catch (error) {
      await client.rollback(); // Rollback transaction in case of error
      throw error; // Throw the error to be caught by the caller
    } finally {
      client.release(); // Release the database connection
    }
  },
};

(async () => {
  try {
    const result = await BookingChores.CleanUp();
    console.log(result);
  } catch (error) {
    console.error(error);
  } finally {
    console.log("Close");
    process.exit(0); // Manually exit the process to ensure it ends
  }
})();
