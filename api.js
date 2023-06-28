require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");
const openaiApiKey = process.env.APIKEY;
const configuration = new Configuration({
  apiKey: openaiApiKey,
});
module.exports = new OpenAIApi(configuration);
