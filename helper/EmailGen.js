const EmailGen = {};

EmailGen.NotifyApproved = (data) => {
  return `<main style="font-family: sans-serif">
  <img
    src="https://safetyfirstindonesia.co.id/assets/uploads/images/9f09b-kpn-corp.png"
    width="40%"
    alt="KPN Corp"
  />
  <h1>Roomeet</h1>
  <p>Hello, ${data.username}</p>
  <p>
    Your booking, <strong>"${data.agenda}"</strong> is
    <strong style="color: green">${data.approval}</strong>.
  </p>
  <table style="width: 100%">
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
</main>`;
};

EmailGen.NotifyRejected = (data) => {
  return `<main style="font-family: sans-serif">
  <img
    src="https://safetyfirstindonesia.co.id/assets/uploads/images/9f09b-kpn-corp.png"
    width="40%"
    alt="KPN Corp"
  />
  <h1>Roomeet</h1>
  <p>Hello, ${data.username}</p>
  <p>
    Your booking, <strong>"${data.agenda}"</strong> is
    <strong style="color: red">${data.approval}</strong>.
  </p>
  <table style="width: 100%">
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
  <blockquote style="background: lightGray; padding: 16px">${data.reject_note}</blockquote>
  <p>Please create a new booking based on the note above</p>
  <hr />
  <p>Thank you.</p>
</main>`;
};

module.exports = EmailGen;
