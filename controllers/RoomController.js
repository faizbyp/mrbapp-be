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
    try {
      const getroom = await client.query("SELECT * from mst_room");
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
            lokasi 
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
                  curtime() BETWEEN time_start 
                  AND time_end 
                  OR DATE_ADD(NOW(), INTERVAL ? HOUR) BETWEEN time_start 
                  AND time_end 
                  AND book_date = DATE_FORMAT(NOW(), '%Y-%m-%d')
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
    const payload = {
      book_date: data.book_date,
      time_start: data.time_start,
      time_end: data.time_end,
      prtcpt_ctr: data.participant,
    };

    try {
      const getRoom = await client.query(
        `SELECT mst_room.id_ruangan, mst_room.nama, mst_room.kapasitas FROM mst_room
          WHERE mst_room.kapasitas >= ${payload.prtcpt_ctr}
		      AND mst_room.is_active = 'T'
          AND NOT EXISTS (
            SELECT 1
            FROM 
					  req_book
            WHERE 
					  req_book.id_ruangan = mst_room.id_ruangan
					  AND req_book.book_date = ${payload.book_date}
					  AND req_book.is_active = 'F'
					  AND (
              (req_book.time_start < '${payload.time_start}' AND req_book.time_end > '${payload.time_end}')
					  )
          )
          ORDER BY mst_room.kapasitas`
      );
      res.status(200).send({
        message: "Success get avail room",
        data: getRoom[0],
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: error.message });
    } finally {
      client.release();
    }
  },
};

module.exports = RoomController;
