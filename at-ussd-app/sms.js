const AfricasTalking = require('africastalking');

function createSmsClient() {
  const username = process.env.AT_USERNAME || 'sandbox';
  const apiKey = process.env.AT_API_KEY;
  const senderId = process.env.AT_SENDER_ID;

  if (!apiKey) {
    console.warn('AT_API_KEY is not set. Outbound SMS will fail until you add it to .env');
  }

  const sms = AfricasTalking({
    apiKey: apiKey || 'missing-api-key',
    username,
  }).SMS;

  async function sendSms(to, message) {
    if (!to || !message) {
      throw new Error('sendSms requires a recipient and a message');
    }

    if (!apiKey) {
      throw new Error('AT_API_KEY is not set');
    }

    const options = {
      to: Array.isArray(to) ? to : [to],
      message,
    };

    if (senderId) {
      options.senderId = senderId;
    }

    const response = await sms.send(options);
    console.log('SMS sent:', JSON.stringify(response));
    return response;
  }

  return { sendSms };
}

module.exports = { createSmsClient };
