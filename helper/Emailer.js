const mailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const EmailGen = require("./EmailGen");

class Mailer {
  constructor() {
    this.tp = mailer.createTransport({
      name: "kpndomain.com",
      host: process.env.SMTP_HOST,
      secure: true,
      port: process.env.SMPT_PORT,
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
      },
      auth: {
        user: `${process.env.SMTP_USERNAME}`,
        pass: `${process.env.SMTP_PASSWORD}`,
      },
    });
  }

  async otpVerifyNew(otpCode, emailTarget) {
    const setup = {
      from: process.env.SMTP_USERNAME,
      to: emailTarget,
      subject: "Roomeet - OTP New User",
      text: `This is your OTP Code: ${otpCode}, this code will expired after 5 minute. Please insert before expiry time`,
    };
    try {
      await this.tp.sendMail(setup);
      return emailTarget;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async otpResetPass(otpCode, emailTarget) {
    const setup = {
      from: process.env.SMTP_USERNAME,
      to: emailTarget,
      subject: "Roomeet - Reset Password",
      text: `This is your OTP Code: ${otpCode}, this code will expired after 5 minute. Please insert before expiry time`,
    };
    try {
      const send = await this.tp.sendMail(setup);
      console.log("success", send);
      return emailTarget;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async approvalNotif(data) {
    console.log("EMAIL RUNNING");
    let setup;

    if (data.approval === "approved") {
      const approved = EmailGen.NotifyApproved(data);
      setup = {
        from: process.env.SMTP_USERNAME,
        to: data.email,
        subject: `Roomeet - Your meeting is ${data.approval}`,
        html: approved,
      };
    } else if (data.approval === "rejected") {
      const rejected = EmailGen.NotifyRejected(data);
      setup = {
        from: process.env.SMTP_USERNAME,
        to: data.email,
        subject: `Roomeet - Your meeting is ${data.approval}`,
        html: rejected,
      };
    }
    try {
      const send = await this.tp.sendMail(setup);
      console.log(send);
      return data.email;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async newBooking(data) {
    const adminEmail = "anggi.pranasa@hotmail.com";
    const setup = {
      from: process.env.SMTP_USERNAME,
      to: adminEmail,
      subject: "Roomeet - New Booking",
      html: EmailGen.NewBookMail(data),
    };
    try {
      const send = await this.tp.sendMail(setup);
      console.log("success", send);
      return adminEmail;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async reminder(data) {
    const setup = {
      from: process.env.SMTP_USERNAME,
      to: adminEmail,
      subject: "Roomeet - Check In Reminder",
      html: EmailGen.NewBookMail(data),
    };
    try {
      const send = await this.tp.sendMail(setup);
      console.log("success", send);
      return adminEmail;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

module.exports = Mailer;
