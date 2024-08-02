const cron = require("node-cron");
const DbConn = require("./DbTransaction");
const webpush = require("web-push");
const moment = require("moment");
const uuid = require("uuidv4");
const Emailer = require("../helper/Emailer");

const NotificationManager = {};

//@param timeSched : Date ; title : string ; message : string ; id_user : string ; id_book : string ;

NotificationManager.CreateNewCron = async (
  timeSched,
  title,
  message,
  id_user,
  id_book,
  id_notif
) => {
  const Client = new DbConn();
  const client = await Client.initConnection();
  try {
    await client.beginTransaction();
    const getSubs = await client.query("SELECT * from notif_sub where id_user = ?", [id_user]);
    const subs = getSubs[0].map((item) => ({
      endpoint: item.endpoint_sub,
      keys: {
        p256dh: item.p256dh_sub,
        auth: item.auth_sub,
      },
    }));
    const dateNotif = moment(timeSched).format();
    const schedule = moment(timeSched).format("s m H D M *");
    const payload = [id_book, dateNotif, 0, id_notif, title, message, "push"];
    const insertSched = await client.query(
      "INSERT INTO push_sched(id_req, notif_time, is_pushed, id_notif, title_notif, message, type) VALUES(?,?,?,?,?,?,?) ;",
      payload
    );
    await client.commit();
    const pushNotif = async () => {
      const Client = new DbConn();
      const client = await Client.initConnection();
      let promises = [];
      try {
        subs.forEach((item) => {
          promises.push(
            webpush.sendNotification(
              item,
              JSON.stringify({
                title: title,
                message: message,
              })
            )
          );
        });
        await Promise.all(promises);
        const setPushedSched = await client.query(
          "UPDATE push_sched SET is_pushed = 1 WHERE id_notif = ?",
          id_notif
        );
        await client.commit();
      } catch (error) {
        await client.rollback();
        console.log(error);
      } finally {
        client.release();
      }
    };
    cron.schedule(schedule, pushNotif, {
      name: id_notif,
    });
  } catch (error) {
    await client.rollback();
    console.log(error);
  } finally {
    client.release();
  }
};

NotificationManager.CleanUpCron = async () => {
  const Client = new DbConn();
  const client = await Client.initConnection();
  try {
    await client.beginTransaction();
    const cronTasks = cron.getTasks();
    const [pushedData, _] = await client.query(
      "SELECT id_notif FROM push_sched WHERE is_pushed = 1 OR notif_time < NOW()"
    );
    pushedData.forEach((item) => {
      global.scheduledTasks.delete(item.id_notif);
    });
    const forDelete = pushedData.map((item) => `'${item}'`);
    const deletePushed = await client.query(
      `DELETE FROM push_sched WHERE is_pushed = 1 OR notif_time < NOW()`
    );
    console.log("notif cleaned");
    await client.commit();
  } catch (error) {
    await client.rollback();
    console.log(error);
  } finally {
    client.release();
  }
};

const rerunNotif = async (item) => {
  const Client = new DbConn();
  const client = await Client.initConnection();
  await client.beginTransaction();
  const subscription = {
    endpoint: item.endpoint_sub,
    keys: {
      p256dh: item.p256dh_sub,
      auth: item.auth_sub,
    },
  };
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: item.title_notif,
        message: item.message,
      })
    );
    const setPushedSched = await client.query(
      "UPDATE push_sched SET is_pushed = 1 WHERE id_notif = ?",
      [item.id_notif]
    );
    await client.commit();
  } catch (error) {
    await client.rollback();
    console.log(error);
  } finally {
    client.release();
  }
};

NotificationManager.ReRunCron = async () => {
  const Client = new DbConn();
  const client = await Client.initConnection();
  try {
    const [dataCron, _] = await client.query(`SELECT
    PS.notif_time,
    PS.id_notif,
    PS.title_notif,
    PS.message,
    NS.endpoint_sub,
    NS.auth_sub,
    NS.p256dh_sub 
  FROM
    push_sched PS
    LEFT JOIN req_book REQ ON PS.id_req = REQ.id_book
    LEFT JOIN notif_sub NS ON NS.id_user = REQ.id_user
    WHERE PS.is_pushed = 0 AND PS.type = 'push'`);

    dataCron.forEach((item) => {
      const schedule = moment(item.notif_time).format("s m H D M *");
      // console.log(schedule);
      if (schedule !== "Invalid date") {
        cron.schedule(schedule, () => rerunNotif(item), {
          name: item.id_notif,
        });
      }
    });
    console.log("notif repushed");
  } catch (error) {
    console.error(error);
  } finally {
    client.release();
  }
};

NotificationManager.CreateNewCronMail = async (timeSched, data) => {
  const Client = new DbConn();
  const client = await Client.initConnection();
  try {
    await client.beginTransaction();
    const dateNotif = moment(timeSched).format();
    const id_notif = uuid.uuid();
    const payload = {
      id_req: data.id_book,
      notif_time: dateNotif,
      is_pushed: 0,
      id_notif: id_notif,
      type: "email",
    };
    const [query, value] = await Client.insertQuery(payload, "push_sched");
    await client.query(query, value);
    const Email = new Emailer();
    const schedule = moment(timeSched).format("s m H D M *");
    console.log(schedule);
    cron.schedule(
      schedule,
      async () => {
        console.log("CRON EMAIL NOTIF", data);
        await Email.reminder(data);
      },
      {
        name: id_notif,
      }
    );
    console.log("CRON EMAIL CREATED", schedule, data.email);
    await client.commit();
  } catch (error) {
    await client.rollback();
    console.log(error);
  } finally {
    client.release();
  }
};

NotificationManager.ReRunCronMail = async () => {
  const Client = new DbConn();
  const client = await Client.initConnection();
  try {
    const Email = new Emailer();
    const [dataCron, _] = await client.query(`SELECT
      PS.notif_time,
      PS.id_notif,
      REQ.agenda,
      REQ.id_ticket,
      REQ.remark,
      REQ.id_ruangan,
      REQ.book_date,
      REQ.time_start,
      REQ.time_end,
      REQ.prtcpt_ctr,
      MU.username,
      MU.email
    FROM
      push_sched PS
      LEFT JOIN req_book REQ ON PS.id_req = REQ.id_book
      LEFT JOIN mst_user MU ON REQ.id_user = MU.id_user
      WHERE PS.is_pushed = 0 AND PS.type = 'email'`);

    dataCron.forEach((item) => {
      const schedule = moment(item.notif_time).format("s m H D M *");
      console.log(schedule);
      if (schedule !== "Invalid date") {
        cron.schedule(
          schedule,
          async () => {
            console.log("CRON EMAIL NOTIF", item);
            await Email.reminder(item);
          },
          {
            name: item.id_notif,
          }
        );
      }
    });
    console.log("email notif recreated");
  } catch (error) {
    console.error(error);
  } finally {
    client.release();
  }
};

module.exports = NotificationManager;
