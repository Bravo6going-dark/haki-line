require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { createSmsClient } = require('./sms');
const { handleIncomingSms, nextCaseRef, normalizePhone } = require('./smsFlow');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const { sendSms } = createSmsClient();

app.get('/', (_req, res) => {
  res.type('text/plain').send('Haki-Line is running');
});

app.post('/ussd', (req, res) => {
  const { text } = req.body;

  let response = '';

  if (text === '') {
    response = `CON Welcome to Haki-Line
1. Know your rights
2. Report a case
3. Emergency contacts`;
  } else if (text === '1') {
    response = `CON Know your rights
1. Arrest & police
2. Domestic violence
3. Work & labour`;
  } else if (text === '1*1') {
    response = `END Arrest: You must be told why you are held, you may stay silent, and you have a right to a lawyer. You should be taken to court within 24 hours.`;
  } else if (text === '1*2') {
    response = `END GBV: Report at a police station or hospital if it is safe. Helpline 1195. Emergency 999 / 112.`;
  } else if (text === '1*3') {
    response = `END Work: You have a right to fair pay, rest, and a safe workplace. Note dates, names, and any documents.`;
  } else if (text === '2') {
    response = `CON Briefly describe what happened (who, where, when):`;
  } else if (text.startsWith('2*') && text.split('*')[1]) {
    const phoneNumber = normalizePhone(req.body.phoneNumber);
    const description = text.split('*').slice(1).join(' ');
    const ref = nextCaseRef();
    console.log(`USSD case ${ref} from ${phoneNumber}: ${description}`);
    response = `END Your report has been received. Ref ${ref}. If this is an emergency, call 999 or 112.`;
    if (phoneNumber) {
      sendSms(
        phoneNumber,
        `Haki-Line: report received. Ref ${ref}. Keep this number. Emergency 999 / 112.`
      ).catch((err) => {
        console.error('Failed to send USSD follow-up SMS:', err.message || err);
      });
    }
  } else if (text === '3') {
    response = `END Police/ambulance 999 or 112. GBV 1195. Childline 116.`;
  } else {
    response = `END Invalid choice. Dial again or SMS HAKI.`;
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
});

// Africa's Talking POSTs inbound SMS here as application/x-www-form-urlencoded
app.post('/sms/incoming', (req, res) => {
  const { to, text, id, date } = req.body;
  const from = normalizePhone(req.body.from);

  res.set('Content-Type', 'text/plain');
  res.status(200).send('OK');

  if (!from) {
    console.warn('Incoming SMS missing from:', req.body);
    return;
  }

  console.log(`Incoming SMS ${id || ''} ${from} -> ${to}: ${text} (${date || ''})`);

  const reply = handleIncomingSms({ from, text });
  if (!reply) return;

  sendSms(from, reply).catch((err) => {
    console.error('Failed to send SMS reply:', err.message || err);
  });
});

// Africa's Talking POSTs delivery reports here
app.post('/sms/delivery-reports', (req, res) => {
  const { id, status, phoneNumber, networkCode, failureReason } = req.body;
  console.log(
    `Delivery report ${id}: ${status} to ${phoneNumber} network=${networkCode}` +
      (failureReason ? ` reason=${failureReason}` : '')
  );
  res.set('Content-Type', 'text/plain');
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Haki-Line running on port ${PORT}`);
  console.log('USSD callback:            POST /ussd');
  console.log('Incoming SMS callback:    POST /sms/incoming');
  console.log('Delivery reports callback: POST /sms/delivery-reports');
});
