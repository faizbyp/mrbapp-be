const DbConn = require("../helper/DbTransaction");
const moment = require("moment");

const penalty = async (req, res, next) => {
  const id_user = req.body.data.id_user;
  const Client = new DbConn();
  const client = await Client.initConnection();
  try {
    await client.beginTransaction();
    const select = await client.query(`SELECT penalty_until FROM mst_user WHERE id_user = ?`, [
      id_user,
    ]);
    const pen = select[0][0].penalty_until;
    let penalty = null;
    if (pen !== null) {
      penalty = moment(pen).format("dddd, DD-MM-YYYY");
    }
    console.log(penalty);
    await client.commit();
    if (penalty !== null) {
      res.status(403).send({
        message: `You have penalty until ${penalty}`,
      });
      console.log(`User have penalty until ${penalty}`);
    } else {
      next();
    }
  } catch (error) {
    await client.rollback();
    res.status(500).send({
      message: error,
    });
    console.error(error);
  } finally {
    client.release();
  }
};

module.exports = penalty;
