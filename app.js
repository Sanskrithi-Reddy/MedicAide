// MedicAide - app.js
// This one file runs the login page, the patient page and the doctor page.
// All the data is saved in localStorage, so every page can read the same data.

var STATE_KEY = "medicaide_data";
var USER_KEY = "medicaide_user";
var DOCTOR_ID = 1;
var DOCTOR_NAME = "Dr. Meera Iyer";


// ---------------------------------------------------------
// DATA
// ---------------------------------------------------------

// The data we start with the first time the site is opened
function makeStartingData() {
  return {
    doctors: [
      { id: 1, name: "Dr. Meera Iyer", spec: "Cardiology", loc: "Adyar, Chennai", slots: ["10:30", "11:00", "11:30", "14:00"] },
      { id: 2, name: "Dr. Karan Shah", spec: "Dermatology", loc: "T. Nagar, Chennai", slots: ["09:00", "09:30", "16:00"] },
      { id: 3, name: "Dr. Anita Rao", spec: "Pediatrics", loc: "Anna Nagar, Chennai", slots: ["10:00", "12:00", "15:30"] }
    ],
    appts: [],
    records: [
      { id: 1, patient: "Asha Rao", name: "Blood test.pdf", date: "28 Oct" }
    ],
    visits: []
  };
}

// Read the saved data from localStorage
function loadData() {
  var saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STATE_KEY));
  } catch (error) {
    saved = null;
  }
  if (saved === null) {
    saved = makeStartingData();
  }
  return saved;
}

// Save the data back to localStorage
function saveData() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(data));
  } catch (error) {
    console.log("Could not save data");
  }
}

// The user who is logged in (patient by default)
function getUser() {
  var user = null;
  try {
    user = JSON.parse(localStorage.getItem(USER_KEY));
  } catch (error) {
    user = null;
  }
  if (user === null) {
    user = { role: "patient", name: "Asha Rao" };
  }
  return user;
}

var data = loadData();


// ---------------------------------------------------------
// SMALL HELPER FUNCTIONS
// ---------------------------------------------------------

// Stops text typed by a user from being treated as HTML
function escapeText(text) {
  var result = String(text);
  result = result.replace(/&/g, "&amp;");
  result = result.replace(/</g, "&lt;");
  result = result.replace(/>/g, "&gt;");
  result = result.replace(/"/g, "&quot;");
  return result;
}

// Turns a Date into text like 2026-11-04 (what the date input uses)
function makeDateString(date) {
  var year = date.getFullYear();
  var month = ("0" + (date.getMonth() + 1)).slice(-2);
  var day = ("0" + date.getDate()).slice(-2);
  return year + "-" + month + "-" + day;
}

function getTodayString() {
  return makeDateString(new Date());
}

function getTomorrowString() {
  var date = new Date();
  date.setDate(date.getDate() + 1);
  return makeDateString(date);
}

// Turns 2026-11-04 into something like "Wed, 4 Nov"
function formatDate(dateString) {
  var date = new Date(dateString + "T00:00");
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

// Sorts appointments by date, then by time
function sortAppts(list) {
  list.sort(function (a, b) {
    var first = a.date + a.time;
    var second = b.date + b.time;
    if (first < second) {
      return -1;
    }
    if (first > second) {
      return 1;
    }
    return 0;
  });
  return list;
}

// Shows a small message at the bottom right for a few seconds
var toastTimer = null;

function showToast(message) {
  var toast = document.querySelector(".toast");
  if (toast === null) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 4000);
}

// Things both dashboards need: log out, reset button, and updating when
// another tab changes the data
function setupCommon(redrawPage) {
  document.querySelector("#logout").addEventListener("click", function () {
    localStorage.removeItem(USER_KEY);
  });

  document.querySelector("#reset").addEventListener("click", function () {
    localStorage.removeItem(STATE_KEY);
    location.reload();
  });

  // This runs when ANOTHER tab saves new data
  window.addEventListener("storage", function (event) {
    if (event.key === STATE_KEY) {
      data = loadData();
      redrawPage();
    }
  });
}


// ---------------------------------------------------------
// LOGIN PAGE
// ---------------------------------------------------------

function setupLoginPage() {
  var form = document.querySelector("form");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var isDoctor = document.querySelector("#r-doctor").checked;
    var typedName = document.querySelector(".signup-only input").value.trim();
    var user = {};

    if (isDoctor) {
      user.role = "doctor";
      user.name = DOCTOR_NAME;
    } else {
      user.role = "patient";
      if (typedName === "") {
        user.name = "Asha Rao";
      } else {
        user.name = typedName;
      }
    }

    localStorage.setItem(USER_KEY, JSON.stringify(user));

    if (isDoctor) {
      location.href = "doctor.html";
    } else {
      location.href = "patient.html";
    }
  });
}


// ---------------------------------------------------------
// PATIENT PAGE
// ---------------------------------------------------------

function setupPatientPage() {
  var patientName = getUser().name;
  var movingId = null; // id of the appointment being rescheduled (null = none)

  var dateInput = document.querySelector("#date");
  var specInput = document.querySelector("#spec");
  var locInput = document.querySelector("#loc");

  document.querySelector("#who").textContent = "Hi, " + patientName;
  dateInput.value = getTomorrowString();
  dateInput.min = getTomorrowString();

  // ----- helper functions for this page -----

  function findAppt(id) {
    for (var i = 0; i < data.appts.length; i++) {
      if (data.appts[i].id === id) {
        return data.appts[i];
      }
    }
    return null;
  }

  function findDoctor(id) {
    for (var i = 0; i < data.doctors.length; i++) {
      if (data.doctors[i].id === id) {
        return data.doctors[i];
      }
    }
    return null;
  }

  // Is this slot already booked by someone?
  function isSlotTaken(doctorId, date, time) {
    for (var i = 0; i < data.appts.length; i++) {
      var appt = data.appts[i];
      if (appt.doctorId === doctorId && appt.date === date && appt.time === time) {
        return true;
      }
    }
    return false;
  }

  // ----- drawing functions (they build the HTML from the data) -----

  function drawDoctors() {
    var movingAppt = null;
    if (movingId !== null) {
      movingAppt = findAppt(movingId);
      if (movingAppt === null) {
        movingId = null; // it was deleted in another tab
      }
    }

    // yellow banner shown while rescheduling
    var bannerHtml = "";
    if (movingAppt !== null) {
      bannerHtml = '<div class="banner"><span>Pick a new time for your visit with ' +
        escapeText(movingAppt.doctor) + '.</span>' +
        '<button class="btn alt sm" data-action="keep">Keep original</button></div>';
    }
    document.querySelector("#banner").innerHTML = bannerHtml;

    var chosenSpec = specInput.value;
    var chosenLoc = locInput.value.toLowerCase();
    var chosenDate = dateInput.value;
    var html = "";

    for (var i = 0; i < data.doctors.length; i++) {
      var doc = data.doctors[i];

      // skip doctors that don't match the filters
      if (chosenSpec !== "Any" && doc.spec !== chosenSpec) {
        continue;
      }
      if (doc.loc.toLowerCase().indexOf(chosenLoc) === -1) {
        continue;
      }
      if (movingAppt !== null && doc.id !== movingAppt.doctorId) {
        continue;
      }

      html += '<article class="panel doc">';
      html += "<h3>" + doc.name + "</h3>";
      html += "<small>" + doc.spec + " · " + doc.loc + "</small>";
      html += '<div class="slots">';

      for (var j = 0; j < doc.slots.length; j++) {
        var time = doc.slots[j];
        var disabled = "";
        if (isSlotTaken(doc.id, chosenDate, time)) {
          disabled = " disabled";
        }
        html += '<button class="slot" data-doctor="' + doc.id + '" data-time="' + time + '"' + disabled + ">" + time + "</button>";
      }

      html += "</div>";
      html += "<small>Showing " + formatDate(chosenDate) + "</small>";
      html += "</article>";
    }

    if (html === "") {
      html = '<p class="empty">No doctors match. Try another specialty or location.</p>';
    }
    document.querySelector("#docs").innerHTML = html;
  }

  function drawMyAppointments() {
    // collect only this patient's appointments
    var mine = [];
    for (var i = 0; i < data.appts.length; i++) {
      if (data.appts[i].patient === patientName) {
        mine.push(data.appts[i]);
      }
    }
    sortAppts(mine);

    var html = "";
    for (var j = 0; j < mine.length; j++) {
      var appt = mine[j];
      html += "<tr>";
      html += "<td>" + escapeText(appt.doctor) + "</td>";
      html += "<td>" + formatDate(appt.date) + ", " + appt.time + "</td>";
      html += '<td class="row-actions">';
      html += '<button class="btn alt sm" data-action="reschedule" data-id="' + appt.id + '">Reschedule</button>';
      html += '<button class="btn alt sm" data-action="cancel" data-id="' + appt.id + '">Cancel</button>';
      html += "</td>";
      html += "</tr>";
    }

    if (html === "") {
      html = '<tr><td colspan="3" class="empty">No appointments yet. Pick a time above to book.</td></tr>';
    }
    document.querySelector("#appt-body").innerHTML = html;
  }

  function drawVisits() {
    var html = "";

    // go backwards so the newest visit is first
    for (var i = data.visits.length - 1; i >= 0; i--) {
      var visit = data.visits[i];
      if (visit.patient !== patientName) {
        continue;
      }

      html += '<article class="panel rx">';
      html += "<h3>" + escapeText(visit.doctor) + "</h3>";
      html += "<small>" + formatDate(visit.date) + "</small>";
      html += "<p><strong>Diagnosis:</strong> " + escapeText(visit.dx) + "</p>";
      html += "<ul><li>";
      html += "<span>" + escapeText(visit.med) + "<br><small>" + escapeText(visit.note) + "</small></span>";
      html += '<span class="tag warn">Daily at ' + visit.time + "</span>";
      html += "</li></ul>";
      html += '<button class="btn alt sm" data-action="test" data-med="' + escapeText(visit.med) + '">Test reminder</button>';
      html += "</article>";
    }

    if (html === "") {
      html = '<p class="empty">Your diagnosis and prescription will show here after a visit.</p>';
    }
    document.querySelector("#visits").innerHTML = html;
  }

  function drawRecords() {
    var html = "";
    for (var i = 0; i < data.records.length; i++) {
      var record = data.records[i];
      if (record.patient === patientName) {
        html += "<tr><td>" + escapeText(record.name) + "</td><td>" + escapeText(record.date) + "</td></tr>";
      }
    }

    if (html === "") {
      html = '<tr><td colspan="2" class="empty">No documents yet.</td></tr>';
    }
    document.querySelector("#rec-body").innerHTML = html;
  }

  function drawAll() {
    drawDoctors();
    drawMyAppointments();
    drawVisits();
    drawRecords();
  }

  // ----- button clicks -----

  // Clicking a time slot: either books a new appointment or moves an old one
  document.querySelector("#docs").addEventListener("click", function (event) {
    var button = event.target;
    if (button.dataset.time === undefined) {
      return; // clicked something that is not a slot
    }

    var doctor = findDoctor(Number(button.dataset.doctor));
    var time = button.dataset.time;
    var date = dateInput.value;

    if (movingId !== null) {
      // reschedule
      var appt = findAppt(movingId);
      appt.date = date;
      appt.time = time;
      movingId = null;
      showToast("Rescheduled to " + formatDate(date) + ", " + time);
    } else {
      // new booking
      data.appts.push({
        id: Date.now(),
        doctorId: doctor.id,
        doctor: doctor.name,
        patient: patientName,
        date: date,
        time: time
      });
      showToast("Booked with " + doctor.name + " on " + formatDate(date) + ", " + time);
    }

    saveData();
    drawAll();
  });

  // "Keep original" button on the yellow banner
  document.querySelector("#banner").addEventListener("click", function (event) {
    if (event.target.dataset.action === "keep") {
      movingId = null;
      drawAll();
    }
  });

  // Reschedule and Cancel buttons in the appointments table
  document.querySelector("#appt-body").addEventListener("click", function (event) {
    var button = event.target;
    var action = button.dataset.action;
    var id = Number(button.dataset.id);

    if (action === "reschedule") {
      movingId = id;
      drawAll();
      document.querySelector("#find").scrollIntoView();
    }

    if (action === "cancel") {
      var remaining = [];
      for (var i = 0; i < data.appts.length; i++) {
        if (data.appts[i].id !== id) {
          remaining.push(data.appts[i]);
        }
      }
      data.appts = remaining;
      saveData();
      drawAll();
      showToast("Appointment cancelled");
    }
  });

  // "Test reminder" button on a prescription
  document.querySelector("#visits").addEventListener("click", function (event) {
    if (event.target.dataset.action === "test") {
      showToast("Time to take " + event.target.dataset.med);
    }
  });

  // redraw the doctor list whenever a filter changes
  specInput.addEventListener("input", drawDoctors);
  locInput.addEventListener("input", drawDoctors);
  dateInput.addEventListener("input", drawDoctors);

  // uploading a medical document
  document.querySelector("#file").addEventListener("change", function (event) {
    var file = event.target.files[0];
    if (file === undefined) {
      return;
    }

    var today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    data.records.push({ id: Date.now(), patient: patientName, name: file.name, date: today });
    saveData();
    drawRecords();
    showToast("Saved " + file.name);
    event.target.value = "";
  });

  // ----- medicine reminders -----
  // Every 15 seconds, check if the clock matches a medicine time
  var lastMinute = "";

  setInterval(function () {
    var now = new Date().toTimeString().slice(0, 5); // like "21:00"
    if (now === lastMinute) {
      return; // already checked this minute
    }
    lastMinute = now;

    for (var i = 0; i < data.visits.length; i++) {
      var visit = data.visits[i];
      if (visit.patient === patientName && visit.time === now) {
        showToast("Time to take " + visit.med);
      }
    }
  }, 15000);

  setupCommon(drawAll);
  drawAll();
}


// ---------------------------------------------------------
// DOCTOR PAGE
// ---------------------------------------------------------

function setupDoctorPage() {
  var patientSelect = document.querySelector("#pt");
  var historySelect = document.querySelector("#hp");

  // Makes a list of patient names this doctor knows about (no repeats)
  function getPatientNames() {
    var names = [];

    for (var i = 0; i < data.appts.length; i++) {
      var appt = data.appts[i];
      if (appt.doctorId === DOCTOR_ID && names.indexOf(appt.patient) === -1) {
        names.push(appt.patient);
      }
    }

    for (var j = 0; j < data.records.length; j++) {
      var record = data.records[j];
      if (names.indexOf(record.patient) === -1) {
        names.push(record.patient);
      }
    }

    return names;
  }

  // Fills a dropdown with names but keeps the old choice if it still exists
  function fillSelect(select, names) {
    var oldValue = select.value;
    var html = "";

    for (var i = 0; i < names.length; i++) {
      html += "<option>" + escapeText(names[i]) + "</option>";
    }
    select.innerHTML = html;

    if (oldValue !== "") {
      select.value = oldValue;
    }
  }

  function drawSchedule() {
    var mine = [];
    for (var i = 0; i < data.appts.length; i++) {
      if (data.appts[i].doctorId === DOCTOR_ID) {
        mine.push(data.appts[i]);
      }
    }
    sortAppts(mine);

    var html = "";
    for (var j = 0; j < mine.length; j++) {
      var appt = mine[j];
      html += "<tr>";
      html += "<td>" + formatDate(appt.date) + ", " + appt.time + "</td>";
      html += "<td>" + escapeText(appt.patient) + "</td>";
      html += '<td><button class="btn alt sm" data-patient="' + escapeText(appt.patient) + '">Add diagnosis</button></td>';
      html += "</tr>";
    }

    if (html === "") {
      html = '<tr><td colspan="3" class="empty">No bookings yet. Book as a patient in another tab and it will appear here.</td></tr>';
    }
    document.querySelector("#sched").innerHTML = html;
  }

  function drawHistory() {
    var patient = historySelect.value;
    var html = "<table><thead><tr><th>Date</th><th>Record</th><th>Source</th></tr></thead><tbody>";

    // diagnoses (newest first)
    for (var i = data.visits.length - 1; i >= 0; i--) {
      var visit = data.visits[i];
      if (visit.patient === patient) {
        html += "<tr>";
        html += "<td>" + formatDate(visit.date) + "</td>";
        html += "<td>" + escapeText(visit.dx) + " (" + escapeText(visit.med) + ")</td>";
        html += "<td>" + escapeText(visit.doctor) + "</td>";
        html += "</tr>";
      }
    }

    // files the patient uploaded
    for (var j = 0; j < data.records.length; j++) {
      var record = data.records[j];
      if (record.patient === patient) {
        html += "<tr>";
        html += "<td>" + escapeText(record.date) + "</td>";
        html += "<td>" + escapeText(record.name) + "</td>";
        html += "<td>Uploaded by patient</td>";
        html += "</tr>";
      }
    }

    html += "</tbody></table>";
    document.querySelector("#hist").innerHTML = html;
  }

  function drawAll() {
    var names = getPatientNames();
    drawSchedule();
    fillSelect(patientSelect, names);
    fillSelect(historySelect, names);
    drawHistory();
  }

  // "Add diagnosis" button in the schedule: picks that patient in the form
  document.querySelector("#sched").addEventListener("click", function (event) {
    var patient = event.target.dataset.patient;
    if (patient === undefined) {
      return;
    }
    patientSelect.value = patient;
    document.querySelector("#upload").scrollIntoView();
    document.querySelector("#dx").focus();
  });

  // choosing a different patient in the history section
  historySelect.addEventListener("change", drawHistory);

  // saving a diagnosis and prescription
  var form = document.querySelector("#rxform");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    data.visits.push({
      id: Date.now(),
      patient: patientSelect.value,
      doctor: DOCTOR_NAME,
      date: getTodayString(),
      dx: document.querySelector("#dx").value,
      med: document.querySelector("#med").value,
      note: document.querySelector("#note").value,
      time: document.querySelector("#mt").value
    });

    saveData();
    form.reset();
    drawAll();
    showToast("Sent to patient");
  });

  setupCommon(drawAll);
  drawAll();
}


// ---------------------------------------------------------
// START: run the right function for the page we are on
// ---------------------------------------------------------

var page = document.body.dataset.page;

if (page === "login") {
  setupLoginPage();
} else if (page === "patient") {
  setupPatientPage();
} else if (page === "doctor") {
  setupDoctorPage();
}
