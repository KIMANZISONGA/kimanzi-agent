const API_BASE = "https://cockpit.urbanchill.org";

/* ---------------- SEND ---------------- */

async function sendForm(endpoint, payload, messageEl, formEl){

try{

const res = await fetch(API_BASE + endpoint,{
method:"POST",
mode:"cors",
credentials:"omit",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify(payload)
});

if(!res.ok){
throw new Error("network");
}

await res.json().catch(()=>({}));

if(messageEl){
messageEl.textContent="Bericht verzonden.";
messageEl.style.color="#2e7d32";
}

if(formEl){
formEl.reset();
}

}catch(err){

console.error(err);

if(messageEl){
messageEl.textContent="Er ging iets mis.";
messageEl.style.color="#b71c1c";
}

}

}

/* ---------------- CONTACT ---------------- */

const contactForm = document.getElementById("contact-form");

if(contactForm){

contactForm.addEventListener("submit",function(e){

e.preventDefault();

const message = document.getElementById("contact-message");

const payload = {
name:contactForm.client_name.value,
email:contactForm.client_email.value,
phone:contactForm.client_phone.value,
topic:"kimanzi-contact",
message:contactForm.notes.value,
source:"kimanzi"
};

sendForm("/api/contact",payload,message,contactForm);

});

}

/* ---------------- INTAKE (optioneel) ---------------- */

const intakeForm = document.getElementById("intake-form");

if(intakeForm){

intakeForm.addEventListener("submit",function(e){

e.preventDefault();

const message = document.getElementById("intake-message");

const payload = {
name:intakeForm.client_name.value,
email:intakeForm.client_email.value,
phone:intakeForm.client_phone.value,
service:intakeForm.service.value,
arrival_date:intakeForm.arrival_date.value,
notes:intakeForm.notes.value,
source:"kimanzi"
};

sendForm("/api/intake",payload,message,intakeForm);

});

}
