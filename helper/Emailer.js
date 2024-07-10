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

  async approvalNotif(data) {
    console.log("EMAIL RUNNING");
    let setup;

    if (data.approval === "approved") {
      setup = {
        from: process.env.SMTP_USERNAME,
        to: data.email,
        subject: `Roomeet - Your meeting is ${data.approval}`,
        html: `<main style="font-family: sans-serif">
        <img src="https://safetyfirstindonesia.co.id/assets/uploads/images/9f09b-kpn-corp.png" width="40%" alt="KPN Corp" />
        <h1>Roomeet</h1>
        <p>Hello, ${data.username}</p>
        <p>Your booking, <strong>"${data.agenda}"</strong> is <strong style="color: green;">${data.approval}</strong>.</p>
        <table>
          <tr>
            <td>Agenda</td>
            <td>${data.agenda}</td>
          </tr>
          <tr>
            <td>Remark</td>
            <td>${data.remark}</td>
          </tr>
          <tr>
            <td>Room</td>
            <td>${data.ruangan}</td>
          </tr>
          <tr>
            <td>Booking Date</td>
            <td>${data.book_date}</td>
          </tr>
          <tr>
            <td>Time</td>
            <td>${data.time_start} - ${data.time_end}</td>
          </tr>
          <tr>
            <td>Participants</td>
            <td>${data.capacity}</td>
          </tr>
        </table>
        <p>Don't forget to check in 15 minutes before the meeting start.</p>
        <hr />
        <p>Thank you.</p>
        </main>
        `,
      };
    } else if (data.approval === "rejected") {
      setup = {
        from: process.env.SMTP_USERNAME,
        to: data.email,
        subject: `Roomeet - Your meeting is ${data.approval}`,
        html: `<main style="font-family: sans-serif">
        <img src="https://safetyfirstindonesia.co.id/assets/uploads/images/9f09b-kpn-corp.png" width="40%" alt="KPN Corp" />
        <h1>Roomeet</h1>
        <p>Hello, ${data.username}</p>
        <p>Your booking, <strong>"${data.agenda}"</strong> is <strong style="color: red;">${data.approval}</strong>.</p>
        <table>
          <tr>
            <td>Agenda</td>
            <td>${data.agenda}</td>
          </tr>
          <tr>
            <td>Remark</td>
            <td>${data.remark}</td>
          </tr>
          <tr>
            <td>Room</td>
            <td>${data.ruangan}</td>
          </tr>
          <tr>
            <td>Booking Date</td>
            <td>${data.book_date}</td>
          </tr>
          <tr>
            <td>Time</td>
            <td>${data.time_start} - ${data.time_end}</td>
          </tr>
          <tr>
            <td>Participants</td>
            <td>${data.capacity}</td>
          </tr>
        </table>
        <p>Here's some note from administrator:</p>
        <blockquote style="background: lightGray;">${data.reject_note}</blockquote>
        <p>Please create a new booking based on the note above</p>
        <hr />
        <p>Thank you.</p>
        </main>
        `,
      };
    }
    try {
      await this.tp.sendMail(setup);
      return data.email;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

module.exports = Mailer;
