const mailer = require("nodemailer");

class Mailer {
  constructor() {
    this.tp = mailer.createTransport({
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
      subject: "Verify New User - OTP",
      text: `This is your OTP Code : ${otpCode}, this code will expired after 5 minute. Please insert before expiry time`,
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
      subject: "Reset Password - OTP",
      text: `This is your OTP Code : ${otpCode}, this code will expired after 5 minute. Please insert before expiry time`,
    };
    try {
      await this.tp.sendMail(setup);
      return emailTarget;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async approvalNotif(data, username, emailTarget) {
    console.log("EMAIL RUNNING");
    let setup;

    if (data.approval === "approved") {
      setup = {
        from: process.env.SMTP_USERNAME,
        to: emailTarget,
        subject: `Roomeet - Your meeting is ${data.approval}`,
        html: `<main style="font-family: sans-serif">
        <h1>Roomeet</h1>
        <p>Hello, ${username}</p>
        <p>Your booking, <strong>"${data.agenda}"</strong> is <strong>${data.approval}</strong>.</p>
        <p>Don't forget to check in 15 minutes before the meeting start.</p>
        <hr />
        <p>Thank you.</p>
        </main>
        `,
      };
    } else if (data.approval === "rejected") {
      setup = {
        from: process.env.SMTP_USERNAME,
        to: emailTarget,
        subject: `Roomeet - Your meeting is ${data.approval}`,
        html: `<main style="font-family: sans-serif">
        <h1>Roomeet</h1>
        <p>Hello, ${username}</p>
        <p>Your booking, <strong>"${data.agenda}"</strong> is <strong>${data.approval}</strong>.</p>
        <p>Here's some note from administrator:</p>
        <p>${data.reject_note}</p>
        <br />
        <p>Please create a new booking based on the note above</p>
        <hr />
        <p>Thank you.</p>
        </main>
        `,
      };
    }
    try {
      await this.tp.sendMail(setup);
      return emailTarget;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

module.exports = Mailer;
