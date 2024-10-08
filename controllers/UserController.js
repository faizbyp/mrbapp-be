const DbConn = require("../helper/DbTransaction");
const Emailer = require("../helper/Emailer");
const OTPHandler = require("../helper/OTPHandler");
const uuid = require("uuidv4");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const { hashPassword, validatePassword } = require("../middleware/hashpass");
const convertTZ = require("../helper/helper");

const UserController = {
  refreshToken: async (req, res) => {
    const refreshToken = req.body?.refreshToken;
    const payload = {
      name: req.body.name,
      username: req.body.username,
      email: req.body.email,
    };
    if (refreshToken === undefined) {
      res.status(403).send({
        message: "Unauthorized",
      });
    }
    const newAccessToken = jwt.sign(payload, process.env.SECRETJWT, {
      expiresIn: "10s",
    });
    res.status(200).send({
      accessToken: newAccessToken,
    });
  },

  loginUser: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      await client.beginTransaction();
      const emailoruname = req.body.username;
      const password = req.body.password;
      let now = new Date();
      if (process.env.MYSQLDB === "mrbapp") {
        now = convertTZ(now, "Asia/Jakarta");
      }
      const checkUserData = await client.query(
        "SELECT email, username, password, nama, id_user, role_id FROM mst_user where username = ? or email = ?",
        [emailoruname, emailoruname]
      );
      if (checkUserData[0].length === 0) {
        throw new Error("User not found");
      }
      const data = checkUserData[0][0];
      if (req.body?.subscription) {
        const subscription = JSON.parse(req.body.subscription);
        const checkUserSub = await client.query("SELECT id FROM notif_sub WHERE endpoint_sub = ?", [
          subscription.sub.endpoint,
        ]);
        if (checkUserSub[0].length !== 0) {
          const deleteSub = await client.query("DELETE FROM notif_sub where endpoint_sub = ?", [
            subscription.sub.endpoint,
          ]);
        }
        let dataNotifSub = [
          data.id_user,
          subscription.sub.endpoint,
          subscription.sub.keys.p256dh,
          subscription.sub.keys.auth,
          moment(now).format(),
        ];
        let insertNotifSub = await client.query(
          "INSERT INTO notif_sub(id_user, endpoint_sub, p256dh_sub, auth_sub, created_date) VALUES(?,?,?,?,?)",
          dataNotifSub
        );
      }
      await client.commit();
      const refreshToken = jwt.sign(
        {
          email: data.email,
          username: data.username,
          name: data.nama,
          id_user: data.id_user,
        },
        process.env.SECRETJWT,
        { expiresIn: "6h" }
      );
      const accessToken = jwt.sign(
        {
          email: data.email,
          username: data.username,
          name: data.nama,
          id_user: data.id_user,
        },
        process.env.SECRETJWT,
        { expiresIn: "5m" }
      );
      if (checkUserData[0].length > 0) {
        const validate = await validatePassword(password, data.password);
        if (!validate) {
          res.status(400).send({
            message: "Password not valid",
          });
        } else {
          res.status(200).send({
            message: `Success sign in, welcome ${data.nama}`,
            data: {
              name: data.username,
              email: data.email,
              id_user: data.id_user,
              role_id: data.role_id,
              accessToken: accessToken,
              refreshToken: refreshToken,
            },
          });
        }
      } else {
        res.status(400).send({
          message: "User not found",
        });
      }
    } catch (error) {
      await client.rollback();
      console.error(error);
      res.status(500).send({
        message: error.message,
      });
    } finally {
      client.release();
    }
  },

  registerUser: async (req, res) => {
    const email = req.body.email;
    const username = req.body.username;
    const password = await hashPassword(req.body.password);
    const payload = {
      nama: req.body.nama,
      business_unit: req.body.business_unit,
      username: req.body.username,
      password: password,
      email: req.body.email,
      id_user: uuid.uuid(),
      role_id: "321de04f-1e49-4ed0-b301-3ed6ea54ce9c",
    };
    const Conn = new DbConn();
    await Conn.init();
    const client = Conn.poolConnection;
    try {
      await client.beginTransaction();
      //check if existing validated
      const existValid = await Conn.select(
        "SELECT * FROM mst_user where username = ? or email = ?",
        [username, email]
      );
      if (existValid[0].length > 0) {
        throw new Error("User already existed");
      }
      const existInvalid = await Conn.select(
        "SELECT * FROM mst_user_temp where username = ? or email = ?",
        [username, email]
      );
      if (!existInvalid[0].length > 0) {
        const [query, val] = Conn.insertQuery(payload, "mst_user_temp");
        const insertToTemp = await client.query(query, val);
      } else {
        throw new Error("User already registered, please verify account");
      }
      // send otp to email to verify registration
      const [otpCode, otpHashed, validUntil] = OTPHandler.createOTP();
      const payloadOtp = {
        email: payload.email,
        otp_code: otpHashed,
        valid_until: validUntil,
      };
      const [qClean, valClean] = Conn.deleteQuery({ email: email }, "otp_trans");
      const [queryOTP, valOTP] = Conn.insertQuery(payloadOtp, "otp_trans");
      const cleanExist = await client.query(qClean, valClean);
      const insertToOTP = await client.query(queryOTP, valOTP);

      const Email = new Emailer();
      const result = await Email.otpVerifyNew(otpCode, payload.email);
      console.log(result);
      await client.commit();
      res.status(200).send({
        message: "User registered, please verify with otp",
      });
    } catch (error) {
      await client.rollback();
      console.error(error);
      res.status(500).send({
        message: error.message,
      });
    } finally {
      client.release();
      Conn.releaseConnection();
    }
  },

  //@New User Verification
  newUserVerify: async (req, res) => {
    const email = req.body.email;
    const otpInput = req.body.otpInput;
    const Conn = new DbConn();
    const client = await Conn.initConnection();
    try {
      const validateOTP = await OTPHandler.validateOTP(otpInput, email);
      await client.beginTransaction();
      const tempUser = await client.query("SELECT * FROM mst_user_temp where email = ?", [email]);
      const userData = tempUser[0][0];
      delete userData.id;
      const [qInsert, valIns] = Conn.insertQuery(userData, "mst_user");
      const [qDelete, valDel] = Conn.deleteQuery({ email: email }, "mst_user_temp");
      const [qDeleteOTP, valDelOTP] = Conn.deleteQuery({ email: email }, "otp_trans");
      let promises = [
        client.query(qInsert, valIns),
        client.query(qDelete, valDel),
        client.query(qDeleteOTP, valDelOTP),
      ];
      const result = Promise.all(promises);
      console.log(result);
      await client.commit();
      res.status(200).send({
        message: "User Validated",
      });
    } catch (error) {
      await client.rollback();
      console.error(error);
      res.status(500).send({
        message: error.message,
      });
    } finally {
      client.release();
    }
  },

  //@Reset forgotten password
  reqResetPassword: async (req, res) => {
    const email = req.body.email;
    const Conn = new DbConn();
    const Mailer = new Emailer();
    const client = await Conn.initConnection();
    try {
      const checkRegis = await client.query("SELECT * FROM mst_user where email = ?", [email]);
      if (checkRegis[0].length === 0) {
        throw new Error("User not registered yet");
      }
      const [otpCode, encodedOTP, validUntil] = OTPHandler.createOTP();
      const payload = {
        email: email,
        otp_code: encodedOTP,
        valid_until: validUntil,
      };
      await client.beginTransaction();
      const [qClean, valClean] = Conn.deleteQuery({ email: email }, "otp_trans");
      const cleanExist = await client.query(qClean, valClean);
      const [queryOTP, valOTP] = Conn.insertQuery(payload, "otp_trans");
      const insertOTP = await client.query(queryOTP, valOTP);
      const sendEmail = await Mailer.otpResetPass(otpCode, email);
      console.log(sendEmail);
      res.status(200).send({
        message: "OTP has sent, please check your email address",
      });
      await client.commit();
    } catch (error) {
      await client.rollback();
      console.log(error);
      res.status(500).send({
        message: error.message,
      });
    } finally {
      client.release();
    }
  },

  //@VerifyResetPassword
  verifResetPass: async (req, res) => {
    const email = req.body.email;
    const otpInput = req.body.otpInput;
    try {
      const validateOTP = await OTPHandler.validateOTP(otpInput, email);
      const sessionToken = jwt.sign({ email: email }, process.env.SECRETJWT, {
        expiresIn: "5m",
      });
      res.cookie("resetpwdSess", sessionToken, {
        httpOnly: true,
        sameSite: false,
        secure: true,
      });
      res.status(200).send({
        message: "OTP Verified",
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({
        message: error.message,
      });
    }
  },

  resetPassword: async (req, res) => {
    const session = req.cookies.resetpwdSess;
    const newPass = req.body.newPass;
    const email = req.body.email;
    try {
      const validateSession = jwt.verify(session, process.env.SECRETJWT);
      const Conn = new DbConn();
      const client = await Conn.initConnection();
      await client.beginTransaction();
      const checkUserexist = await client.query("SELECT * FROM mst_user WHERE email = ? ", [email]);
      if (checkUserexist[0].length == 0) {
        throw new Error("User not found");
      }
      const hashedNewPass = await hashPassword(newPass);
      const payload = {
        password: hashedNewPass,
      };
      const [qUpPass, valUpPass] = Conn.updateQuery(payload, { email: email }, "mst_user");
      const updatePass = await client.query(qUpPass, valUpPass);
      await client.commit();
      res.status(200).send({
        message: "Password has reset",
      });
    } catch (error) {
      if (error?.name == "TokenExpiredError") {
        res.status(403).send("Session Expired");
      } else if (error?.name == "JsonWebTokenError") {
        res.status(403).send("Invalid Session");
      } else {
        res.status(500).send(error.message);
      }
    } finally {
      client.release();
    }
  },

  getEmailDomain: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      await client.beginTransaction();
      const getEmail = await client.query(`
        SELECT domain FROM allowed_email
        `);
      await client.commit();
      res.status(200).send({ data: getEmail[0] });
    } catch (error) {
      await client.rollback();
      res.status(500).send({
        message: error.message,
      });
    } finally {
      client.release();
    }
  },

  getBizUnit: async (req, res) => {
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      await client.beginTransaction();
      const getUnit = await client.query(`
        SELECT * FROM mst_biz_unit
        `);
      await client.commit();
      res.status(200).send({ data: getUnit[0] });
    } catch (error) {
      await client.rollback();
      res.status(500).send({
        message: error.message,
      });
    } finally {
      client.release();
    }
  },

  checkPenalty: async (req, res) => {
    const id_user = req.body.id_user;
    const Client = new DbConn();
    const client = await Client.initConnection();
    try {
      await client.beginTransaction();
      const updateData = await client.query(
        `
        UPDATE mst_user SET penalty_until = null, penalty_ctr = 0
        WHERE id_user = ? AND penalty_until < CONVERT_TZ(NOW(), '+00:00', '+07:00') 
        `,
        [id_user]
      );
      const select = await client.query(
        `SELECT penalty_until, penalty_ctr FROM mst_user WHERE id_user = ?`,
        [id_user]
      );
      console.log(updateData);
      const pen = select[0][0].penalty_until;
      const counter = select[0][0].penalty_ctr;
      let penalty = null;
      if (pen !== null) {
        penalty = moment(pen).format("dddd, DD-MM-YYYY, HH:mm");
      }
      console.log(penalty);
      await client.commit();
      if (updateData[0].changedRows === 1) {
        res.status(200).send({
          message: "Your penalty is finished",
          updated: true,
          counter: counter,
        });
        console.log(`${id_user} penalty finished`);
      } else if (penalty !== null) {
        res.status(403).send({
          message: `You have penalty until ${penalty}`,
          penalty: penalty,
          counter: counter,
        });
        console.log(`User have penalty until ${penalty}`);
      } else {
        res.status(200).send({
          message: "User don't have penalty",
          counter: counter,
        });
        console.log("User don't have penalty");
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
  },
};

module.exports = UserController;
