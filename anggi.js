const express = require("express");
const mysql = require("mysql");

const app = express();
const port = 3000;

const connection = mysql.createConnection({
  host: "172.30.6.167",
  user: "root",
  password: "kpnwb#*46",
  database: "mrbapp",
  // host: 'localhost',
  // user: 'root',
  // password: '',
  // database: 'mrbapp'
});

connection.connect();

// --------------------------- Informasi nama ruangan ----------------------------------------
app.get("/room", (req1, res1) => {
  const ipAddress1 = req1.query.ipAddress1;

  connection.query(
    "SELECT \
        id_ruangan, \
        nama AS nama_ruangan, \
        ip_address, \
        image_background \
    FROM mst_room  \
    WHERE \
        ip_address = ? ",
    [ipAddress1],
    (error, results1, fields) => {
      if (error) throw error;
      res1.json(results1);
    }
  );
});

// --------------------------- Event meeting yang sedang berlangung --------------------------
app.get("/onmeet", (req2, res2) => {
  const formattedDate = req2.query.formattedDate2;
  const formattedTime = req2.query.formattedTime2;
  const ipAddress2 = req2.query.ipAddress2;

  connection.query(
    "SELECT \
        a.id_ticket, \
        a.id_ruangan, \
        c.nama AS nama_ruangan, \
        c.ip_address, \
        a.id_user, \
        b.nama AS nama_user, \
        b.business_unit, \
        a.book_date, \
        a.category, \
        a.time_start, \
        DATE_FORMAT(time_start, '%H:%i') AS time_start_formatted, \
        a.time_end, \
        DATE_FORMAT(time_end, '%H:%i') AS time_end_formatted, \
        a.agenda, \
        a.prtcpt_ctr AS peserta, \
        a.remark, \
        a.check_in, \
        a.check_out \
    FROM req_book a \
    LEFT JOIN mst_user b \
    ON a.id_user = b.id_user \
    LEFT JOIN mst_room c \
    ON a.id_ruangan = c.id_ruangan \
    WHERE a.book_date = ? AND \
        a.approval = 'approved' AND \
        c.ip_address = ? AND \
        a.time_start <= ? AND \
        a.time_end >= ?",
    [formattedDate, ipAddress2, formattedTime, formattedTime],
    (error, results2, fields) => {
      if (error) throw error;
      res2.json(results2);
    }
  );
});

// --------------------------- Event next meeting -----------------------------------------
app.get("/nextmeet", (req3, res3) => {
  const formattedDate = req3.query.formattedDate2;
  const formattedTime = req3.query.formattedTime2;
  const ipAddress3 = req3.query.ipAddress3;

  connection.query(
    "SELECT \
        a.id_ticket, \
        a.id_ruangan, \
        c.nama AS nama_ruangan, \
        c.ip_address, \
        a.id_user, \
        b.nama AS nama_user, \
        b.business_unit, \
        a.book_date, \
        a.category, \
        a.time_start, \
        DATE_FORMAT(time_start, '%H:%i') AS time_start_formatted, \
        a.time_end, \
        DATE_FORMAT(time_end, '%H:%i') AS time_end_formatted, \
        a.agenda, \
        a.prtcpt_ctr AS peserta, \
        a.remark, \
        a.check_in, \
        a.check_out \
    FROM req_book a \
    LEFT JOIN mst_user b \
    ON a.id_user = b.id_user \
    LEFT JOIN mst_room c \
    ON a.id_ruangan = c.id_ruangan \
    WHERE a.book_date = ? AND \
        a.approval = 'approved' AND \
        c.ip_address = ? AND \
        a.time_start > ? \
        ORDER BY time_start ASC",
    [formattedDate, ipAddress3, formattedTime],
    (error, results3, fields) => {
      if (error) throw error;
      res3.json(results3);
    }
  );
});

// --------------------------- Event previous meeting -----------------------------------------
app.get("/prevmeet", (req4, res4) => {
  const formattedDate = req4.query.formattedDate2;
  const formattedTime = req4.query.formattedTime2;
  const ipAddress4 = req4.query.ipAddress4;

  connection.query(
    "SELECT \
        a.id_ticket, \
        a.id_ruangan, \
        c.nama AS nama_ruangan, \
        c.ip_address, \
        a.id_user, \
        b.nama AS nama_user, \
        b.business_unit, \
        a.book_date, \
        a.category, \
        a.time_start, \
        DATE_FORMAT(time_start, '%H:%i') AS time_start_formatted, \
        a.time_end, \
        DATE_FORMAT(time_end, '%H:%i') AS time_start_formatted, \
        a.agenda, \
        a.prtcpt_ctr AS peserta, \
        a.remark, \
        a.check_in, \
        a.check_out \
    FROM req_book a \
    LEFT JOIN mst_user b \
    ON a.id_user = b.id_user \
    LEFT JOIN mst_room c \
    ON a.id_ruangan = c.id_ruangan \
    WHERE a.book_date = ? AND \
        a.approval = 'approved' AND \
        c.ip_address = ? AND \
        time_end < ? \
	    ORDER BY (time_end) DESC \
	    LIMIT 1",
    [formattedDate, ipAddress4, formattedTime],
    (error, results4, fields) => {
      if (error) throw error;
      res4.json(results4);
    }
  );
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
