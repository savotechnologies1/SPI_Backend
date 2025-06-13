// twilioHelper.js
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

module.exports.createMessage = async(number,body)=>{
  try {
    const message = await client.messages.create({
      body,
      from: "+15005550006", // Twilio sandbox/test number
      to: number,
    });
    return message;  // Return the message response
    
  } catch (err) {
    throw new Error('Failed to send SMS');
  }
}

