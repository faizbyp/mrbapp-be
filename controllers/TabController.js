const DbConn = require("../helper/DbTransaction");

const TabController = {
  getRoomInfo: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      await client.beginTransaction();
      const ipAddress = req.query.ipAddress1;
      const data = await client.query(
        `SELECT
            id_ruangan,
            nama AS nama_ruangan,
            ip_address,
            image_background
        FROM mst_room
        WHERE ip_address = ?`,
        [ipAddress]
      );
      await client.commit();
      res.status(200).send(data[0]);
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

  onMeeting: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      await client.beginTransaction();
      const formattedDate = req.query.formattedDate2;
      const formattedTime = req.query.formattedTime2;
      const ipAddress = req.query.ipAddress2;
      const data = await client.query(
        `SELECT
            a.id_ticket,
            a.id_ruangan,
            c.nama AS nama_ruangan,
            c.ip_address,
            a.id_user,
            b.nama AS nama_user,
            b.business_unit,
            d.division,
            a.book_date,
            a.category,
            a.time_start,
            DATE_FORMAT(time_start, '%H:%i') AS time_start_formatted,
            a.time_end,
            DATE_FORMAT(time_end, '%H:%i') AS time_end_formatted,
            a.agenda,
            a.prtcpt_ctr AS peserta,
            a.remark,
            a.check_in,
            a.check_out
        FROM req_book a
        LEFT JOIN mst_user b
        ON a.id_user = b.id_user
        LEFT JOIN mst_room c
        ON a.id_ruangan = c.id_ruangan
        LEFT JOIN mst_biz_unit d
        ON b.business_unit = d.id_unit
        WHERE a.book_date = ? AND
            a.approval = 'approved' AND
            a.is_active = 'T' AND
            c.ip_address = ? AND
            a.time_start <= ? AND
            a.check_out = 'F' AND
            a.time_end >= ?`,
        [formattedDate, ipAddress, formattedTime, formattedTime]
      );
      await client.commit();
      res.status(200).send(data[0]);
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

  nextMeeting: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      await client.beginTransaction();
      const formattedDate = req.query.formattedDate2;
      const formattedTime = req.query.formattedTime2;
      const ipAddress = req.query.ipAddress3;
      const data = await client.query(
        `SELECT
            a.id_ticket,
            a.id_ruangan,
            c.nama AS nama_ruangan,
            c.ip_address,
            a.id_user,
            b.nama AS nama_user,
            b.business_unit,
            d.division,
            a.book_date,
            a.category,
            a.time_start,
            DATE_FORMAT(time_start, '%H:%i') AS time_start_formatted,
            a.time_end,
            DATE_FORMAT(time_end, '%H:%i') AS time_end_formatted,
            a.agenda,
            a.prtcpt_ctr AS peserta,
            a.remark,
            a.check_in,
            a.check_out
        FROM req_book a
        LEFT JOIN mst_user b
        ON a.id_user = b.id_user
        LEFT JOIN mst_room c
        ON a.id_ruangan = c.id_ruangan
        LEFT JOIN mst_biz_unit d
        ON b.business_unit = d.id_unit
        WHERE a.book_date = ? AND
            a.approval = 'approved' AND
            a.is_active = 'T' AND
            c.ip_address = ? AND
            a.time_start > ?
            ORDER BY time_start ASC`,
        [formattedDate, ipAddress, formattedTime]
      );
      await client.commit();
      res.status(200).send(data[0]);
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

  prevMeeting: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      await client.beginTransaction();
      const formattedDate = req.query.formattedDate2;
      const formattedTime = req.query.formattedTime2;
      const ipAddress = req.query.ipAddress4;
      const data = await client.query(
        `SELECT
            a.id_ticket,
            a.id_ruangan,
            c.nama AS nama_ruangan,
            c.ip_address,
            a.id_user,
            b.nama AS nama_user,
            b.business_unit,
            d.division,
            a.book_date,
            a.category,
            a.time_start,
            DATE_FORMAT(time_start, '%H:%i') AS time_start_formatted,
            a.time_end,
            DATE_FORMAT(time_end, '%H:%i') AS time_end_formatted,
            a.agenda,
            a.prtcpt_ctr AS peserta,
            a.remark,
            a.check_in,
            a.check_out
        FROM req_book a
        LEFT JOIN mst_user b
        ON a.id_user = b.id_user
        LEFT JOIN mst_room c
        ON a.id_ruangan = c.id_ruangan
        LEFT JOIN mst_biz_unit d
        ON b.business_unit = d.id_unit
        WHERE a.book_date = ? AND
            a.approval = 'approved' AND
            c.ip_address = ? AND
            time_end < ?
          ORDER BY (time_end) ASC`,
        [formattedDate, ipAddress, formattedTime]
      );
      await client.commit();
      res.status(200).send(data[0]);
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
};

module.exports = TabController;
