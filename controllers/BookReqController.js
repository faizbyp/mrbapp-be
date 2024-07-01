const DbConn = require("../helper/DbTransaction");
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
    await Client.init();
    const data = req.body.data;
    const ai = await Client.select("SELECT id from req_book order by id desc limit 1;");
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
    await Notif.CreateNewCron(
      bookDate,
      "Meeting Check In Reminder",
      "Please check in for agenda :" + data.agenda,
      data.id_user,
      id_book,
      id_notif
    );
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
    };
    try {
      const result = await Client.insert(payload, "req_book");
      res.status(200).send({
        message: "Room Booked",
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: error.message });
    }
  },

  editBook: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      const data = req.body.data;
      console.log(data);
      const id_book = data.id_book;
      const id_user = data.id_user;
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
      const [query, value] = Client.updateQuery(
        payload,
        { id_book: id_book, id_user: id_user },
        "req_book"
      );
      const updateData = await client.query(query, value); // only updated on second request?
      await client.commit();
      res.status(200).send({
        message: `${id_book} is updated`,
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
      const id_book = req.body.id_book;
      await client.beginTransaction();

      const [query, value] = Client.updateQuery(
        { is_active: "F" },
        { id_book: id_book },
        "req_book"
      );
      const updateData = await client.query(query, value);
      res.status(200).send({
        message: `${id_book} is cancled`,
      });
    } catch (error) {
      res.status(500).send({
        message: error.message,
      });
    }
  },

  showAllBook: async (req, res) => {
    const Client = new DbConn();
    await Client.init();
    try {
      const showall = await Client.select("SELECT * FROM req_book");
      res.status(200).send({ data: showall[0] });
    } catch (error) {
      console.error(error);
      res.status(500).send(error);
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
        time_start,
        time_end,
        book_date,
        CASE 
          WHEN NOW() > upcoming_time AND NOW() < start_time THEN 'Oncoming'
          WHEN NOW() > start_time AND NOW() < end_time THEN 'Ongoing'
          WHEN NOW() < start_time THEN 'Prospective'
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

  updateBook: async (req, res) => {
    const Client = new DbConn();
    await Client.init();
    try {
      const data = req.body.data;
      // const colData = {
      //   id_ruangan: data.id_ruangan,
      //   book_date: data.book_date,
      //   time_start: data.time_start,
      //   time_end: data.time_end,
      //   agenda: data.agenda,
      //   prtcpt_ctr: data.participant,
      //   remark: data.remark,
      // };
      const whereReq = req.body.where;
      let payload = {};
      let where = {};
      Object.keys(data).map((item) => {
        // colData
        if (!BookReqCol.includes(item)) {
          throw new Error(`Column ${item} not found`);
        }
        payload[item] = data[item]; // colData
      });
      Object.keys(whereReq).map((item) => {
        if (!BookReqCol.includes(item)) {
          throw new Error(`Column ${item} not found`);
        }
        where[item] = `'${whereReq[item]}'`;
      });
      const updateData = await Client.update(payload, where, "req_book");
      res.status(200).send(updateData);
    } catch (error) {
      console.error(error);
      res.status(500).send(error);
    }
  },
};

module.exports = BookReqController;
