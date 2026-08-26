const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/ussd', (req, res) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  let response = '';

  // text is empty on the very first dial
  if (text === '') {
    response = `CON Welcome to My App
1. Check Balance
2. Buy Airtime`;
  }
  // user picked option 1 from the main menu
  else if (text === '1') {
    response = `END Your balance is KES 500`;
  }
  // user picked option 2 from the main menu
  else if (text === '2') {
    response = `CON Enter amount to buy:`;
  }
  // user picked option 2, then typed an amount (text looks like "2*100")
  else if (text.startsWith('2*')) {
    const amount = text.split('*')[1];
    response = `END You bought KES ${amount} airtime`;
  }
  // anything else = invalid input
  else {
    response = `END Invalid choice. Please try again.`;
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});