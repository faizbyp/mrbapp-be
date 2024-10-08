const DbConn = require("../helper/DbTransaction");
const db = require("../config/db");

const RoomController = {
  getAllRoom: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      const get = await client.query("SELECT * from mst_room");
      const rooms = get[0];
      res.status(200).send(rooms);
    } catch (error) {
      console.error(error);
      res.status(500).send(error);
    } finally {
      client.release();
    }
  },

  getAllRoomWithFac: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    const id_room = req.query.id_room || null;
    try {
      const getroom = await client.query(
        `SELECT * from mst_room
        LEFT JOIN mst_category
          ON mst_room.category = mst_category.id_category
        WHERE (id_ruangan = ? OR ? IS NULL)`,
        [id_room, id_room]
      );
      const rooms = getroom[0];
      let roomFac = [];
      let promise = [];
      rooms.forEach((item) => {
        promise.push(
          client.query(
            `SELECT MF.nama from fas_room FR LEFT JOIN mst_fas MF
        ON FR.id_fasilitas = MF.id_fasilitas 
        WHERE id_ruangan = ?`,
            item.id_ruangan
          )
        );
      });
      const dataGet = await Promise.all(promise);
      rooms.forEach((item, index) => {
        const fac = dataGet[index][0].map((item) => item.nama);
        roomFac.push({ ...item, fasilitas: fac });
      });
      res.status(200).send({ data: roomFac });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: error.message });
    } finally {
      client.release();
    }
  },

  getAvailableRoomWithParam: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    // await Client.init();
    try {
      const hours = req.query.hours;
      if (hours === undefined) {
        throw Error("parameter is empty");
      }
      const getroom = await client.query(
        `SELECT 
            id, 
            id_ruangan, 
            kapasitas, 
            nama, 
            lokasi,
            image
          FROM 
            mst_room 
          WHERE 
            id_ruangan NOT IN (
              SELECT 
                id_ruangan 
              FROM 
                req_book 
              WHERE 
                (
                  CONVERT_TZ(CURTIME(), '+00:00', '+07:00') BETWEEN time_start 
                  AND time_end 
                  OR DATE_ADD(CONVERT_TZ(NOW(), '+00:00', '+07:00'), INTERVAL ? HOUR) BETWEEN time_start 
                  AND time_end 
                  AND book_date = DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '+07:00'), '%Y-%m-%d')
                )
            )
        `,
        [hours]
      );
      const rooms = getroom[0];
      let roomFac = [];
      let promise = [];
      rooms.forEach((item) => {
        promise.push(
          client.query(`SELECT MF.nama from fas_room FR LEFT JOIN mst_fas MF
          ON fr.id_fasilitas = MF.id_fasilitas 
          WHERE id_ruangan = '${item.id_ruangan}'`)
        );
      });
      const dataGet = await Promise.all(promise);
      rooms.forEach((item, index) => {
        const fac = dataGet[index][0].map((item) => item.nama);
        roomFac.push({ ...item, fasilitas: fac });
      });
      res.status(200).send({ data: roomFac });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: error.message });
    } finally {
      client.release();
    }
  },

  getAvailableRoom: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();

    const data = req.body.data;
    // const dateBook = new Date

    const payload = {
      book_date: data.book_date,
      time_start: data.time_start,
      time_end: data.time_end,
      prtcpt_ctr: data.participant,
      category: data.category,
      id_book: data.id_book ? data.id_book : "",
    };

    console.log(payload);

    try {
      await client.beginTransaction();
      const getRoom = await client.query(
        `SELECT mst_room.id_ruangan, mst_room.nama, mst_room.kapasitas FROM mst_room
          WHERE mst_room.kapasitas >= ?
          AND mst_room.category = ?
		      AND mst_room.is_active = 'T'
          AND mst_room.id_ruangan NOT IN (
            SELECT distinct req_book.id_ruangan
            FROM 
					  req_book
            WHERE
					  req_book.book_date = ?
					  AND IF (? = "", req_book.is_active = 'T', false)
					  AND (
              (req_book.time_start < ? AND req_book.time_end > ?)
					  )
          )
          ORDER BY mst_room.kapasitas`,
        [
          payload.prtcpt_ctr,
          payload.category,
          payload.book_date,
          payload.id_book,
          payload.time_end,
          payload.time_start,
        ]
      );
      await client.commit();
      res.status(200).send({
        message: "Success get avail room",
        data: getRoom[0],
      });
    } catch (error) {
      await client.rollback();
      console.log(error);
      res.status(500).send({ message: error.message });
    } finally {
      client.release();
    }
  },

  getRoomDetails: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    const id = req.params.id_ruangan;
    try {
      const get = await client.query(
        `SELECT
          mst_fas.nama AS fasilitas,
          mst_room.*,
          mst_category.*,
          fas_room.*
        FROM mst_room
        LEFT JOIN mst_category
          ON mst_room.category = mst_category.id_category
        LEFT JOIN fas_room
          ON mst_room.id_ruangan = fas_room.id_ruangan
        LEFT JOIN mst_fas
          on fas_room.id_fasilitas = mst_fas.id_fasilitas
        WHERE mst_room.id_ruangan = ?`,
        [id]
      );
      const room = get[0][0];
      res.status(200).send(room);
    } catch (error) {
      console.error(error);
      res.status(500).send(error);
    } finally {
      client.release();
    }
  },
};

module.exports = RoomController;
