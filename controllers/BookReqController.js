const DbConn = require("../helper/DbTransaction");
const Emailer = require("../helper/Emailer");
const Notif = require("../helper/NotificationManager");
const moment = require("moment");
const uuid = require("uuidv4");

const BookReqCol = [
  "id_ruangan",
  "id_user",
  "created_at",
  "book_date",
  "time_start",
  "time_end",
  "agenda",
  "prtcpt_ctr",
  "remark",
  "is_active",
  "id_book",
];

const BookReqController = {
  createBook: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    const data = req.body.data;
    // AI AUTO INCREMENT
    const ai = await client.query("SELECT id from req_book order by id desc limit 1;");
    const ai_book = ai[0][0].id % 999;
    console.log(ai_book);
    const today = new Date();
    const month = today.getMonth() + 1;
    const id_booking =
      "RM" +
      today.getFullYear().toString().slice(-2) +
      ("0" + month).slice(-2) +
      ("0" + today.getDate()).slice(-2) +
      ("000" + ai_book).slice(-3);
    const id_book = uuid.uuid();
    const id_notif = uuid.uuid();
    const bookDate = moment(new Date(`${data.book_date} ${data.time_start}`)).subtract(15, "m");
    // await Notif.CreateNewCron(
    //   bookDate,
    //   "Meeting Check In Reminder",
    //   "Please check in for agenda: " + data.agenda,
    //   data.id_user,
    //   id_book,
    //   id_notif
    // );
    const payload = {
      id_ruangan: data.id_ruangan,
      id_user: data.id_user,
      created_at: today,
      book_date: data.book_date,
      time_start: data.time_start,
      time_end: data.time_end,
      agenda: data.agenda,
      prtcpt_ctr: data.participant,
      remark: data.remark,
      id_book: id_book,
      is_active: "T",
      id_notif: id_notif,
      id_booking: id_booking,
      approval: "pending",
      check_in: "F",
      check_out: "F",
    };
    try {
      await client.beginTransaction();
      const [query, value] = await Client.insertQuery(payload, "req_book");
      await client.query(query, value);
      res.status(200).send({
        message: "Room Booked",
        id_book: id_book,
      });
      client.commit();
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: error.message });
      client.rollback();
    } finally {
      client.release();
    }
  },

  getBookById: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      await client.beginTransaction();
      const value = req.params.id_book;
      const query =
        "SELECT req_book.*, mst_user.username, mst_user.email FROM req_book LEFT JOIN mst_user ON req_book.id_user = mst_user.id_user AND id_book = ?";
      const data = await client.query(query, value);
      await client.commit();
      res.status(200).send(data[0][0]);
      console.log(data);
    } catch (error) {
      await client.rollback();
      res.status(500).send({
        message: error.message,
      });
    } finally {
      client.release();
    }
  },

  editBook: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      const data = req.body.data;
      console.log(data);
      const id_book = req.params.id_book;
      if (!id_book) {
        throw Error("Request Error");
      }
      const payload = {
        id_ruangan: data.id_ruangan,
        book_date: data.book_date,
        time_start: data.time_start,
        time_end: data.time_end,
        agenda: data.agenda,
        prtcpt_ctr: data.participant,
        remark: data.remark,
      };
      await client.beginTransaction();
      const [query, value] = Client.updateQuery(payload, { id_book: id_book }, "req_book");
      const updateData = await client.query(query, value);
      await client.commit();
      res.status(200).send({
        message: "Book updated",
        id_book: id_book,
      });
      console.log(query, value);
      console.log(updateData);
    } catch (error) {
      await client.rollback();
      res.status(500).send({
        message: error.message,
      });
    } finally {
      client.release();
    }
  },

  cancelBook: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      const id_book = req.params.id_book;
      await client.beginTransaction();

      const [query, value] = Client.updateQuery(
        { is_active: "F" },
        { id_book: id_book },
        "req_book"
      );
      const updateData = await client.query(query, value);
      await client.commit();
      res.status(200).send({
        message: `${id_book} is canceled`,
      });
    } catch (error) {
      await client.rollback();
      res.status(500).send({
        message: error.message,
      });
    }
  },

  showAllBook: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      await client.beginTransaction();
      const showall = await client.query(
        "SELECT req_book.*, mst_user.username FROM req_book LEFT JOIN mst_user ON req_book.id_user = mst_user.id_user"
      );
      await client.commit();
      res.status(200).send({ data: showall[0] });
    } catch (error) {
      await client.rollback();
      console.error(error);
      res.status(500).send(error);
    } finally {
      client.release();
    }
  },

  showBookbyUser: async (req, res) => {
    const Client = new DbConn();
    await Client.init();
    try {
      const userid = req.query.id_user;
      if (userid === undefined) {
        throw Error("Request Error");
      }
      const showData = await Client.select(
        `SELECT
        id_book,
        id_user,
        MR.nama as nama_ruangan,
        MR.id_ruangan as id_room,
        agenda,
        BK.is_active,
        BK.approval,
        time_start,
        time_end,
        book_date,
        CASE 
          WHEN NOW() > upcoming_time AND NOW() < start_time AND BK.is_active = 'T' AND BK.approval = 'approved' THEN 'Oncoming'
          WHEN NOW() > start_time AND NOW() < end_time AND BK.is_active = 'T' AND BK.approval = 'approved' THEN 'Ongoing'
          WHEN NOW() < start_time AND BK.is_active = 'T' THEN 'Pending'
          WHEN NOW() > end_time OR BK.is_active = 'F' THEN 'Inactive' 
          ELSE ''
        END AS status
      FROM
        (
        SELECT
          id_book,
          id_ruangan,
          agenda,
          id_user,
          is_active,
          approval,
          DATE_FORMAT(time_start, '%H:%i') as time_start,
          DATE_FORMAT(book_date, '%Y-%m-%d') as book_date,
          DATE_FORMAT(time_end, '%H:%i') as time_end,
          TIMESTAMP (
          CONCAT( book_date, ' ', time_start )) AS start_time,
          TIMESTAMP (
          CONCAT( book_date, ' ', time_end)) AS end_time,
          TIMESTAMP ( TIMESTAMP (
          CONCAT( book_date, ' ', time_start )) - INTERVAL 15 MINUTE ) AS upcoming_time 
        FROM
        req_book 
        ) BK 
        LEFT JOIN mst_room MR ON BK.id_ruangan = MR.id_ruangan 
        WHERE id_user = ?`,
        [userid]
      );
      const data = showData[0];
      res.status(200).send({ data: data });
    } catch (error) {
      console.error(error);
      if (error.message === "Request Error") {
        res.status(400).send({ message: error.message });
      } else {
        res.status(500).send({ message: error.message });
      }
    }
  },

  showBookbyRoom: async (req, res) => {
    const Client = new DbConn();
    await Client.init();
    try {
      const roomId = req.query.roomid;
      if (roomId === undefined) {
        throw Error("Request Error");
      }
      const get = await Client.select(
        "SELECT * FROM req_book where id_ruangan = ? and is_active = 'F'",
        [roomId]
      );
      const books = get[0];
      res.status(200).send({ data: books });
    } catch (error) {
      console.log(error);
      res.status(500).send(error);
    }
  },

  approval: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      const data = req.body.data;
      const id_book = req.params.id_book;
      const id_notif = uuid.uuid();
      const bookDate = moment(new Date(`${data.book_date} ${data.time_start}`)).subtract(15, "m");
      if (!id_book) {
        throw Error("Request Error");
      }
      const payload = {
        approval: data.approval,
        reject_note: data.reject_note,
      };
      console.log(payload);
      await client.beginTransaction();
      const [query, value] = Client.updateQuery(payload, { id_book: id_book }, "req_book");
      const updateData = await client.query(query, value);
      await client.commit();

      if (data.approval === "approved") {
        await Notif.CreateNewCron(
          bookDate,
          "Meeting Check In Reminder",
          "Please check in for agenda: " + data.agenda,
          data.id_user,
          id_book,
          id_notif
        );
      }
      const Email = new Emailer();
      await Email.approvalNotif(data);
      res.status(200).send({
        message: `Book ${data.approval}`,
        id_book: id_book,
        reject_note: data.reject_note,
      });
      console.log(query, value);
      console.log(updateData);
    } catch (error) {
      await client.rollback();
      res.status(500).send({
        message: error.message,
      });
    } finally {
      client.release();
    }
  },
};

module.exports = BookReqController;
