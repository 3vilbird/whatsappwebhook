/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */
var openai = require("./api.js");
var bodyParser = require("body-parser");
var express = require("express");
require("dotenv").config();
var app = express();
var xhub = require("express-x-hub");
app.set("port", process.env.PORT || 5000);
app.listen(app.get("port"));

app.use(xhub({ algorithm: "sha1", secret: process.env.APP_SECRET }));
app.use(bodyParser.json());

var token = process.env.TOKEN || "token";
var received_updates = [];

app.get("/", function (req, res) {
  console.log(req);
  res.send("<pre>" + JSON.stringify(received_updates, null, 2) + "</pre>");
});

app.get(["/facebook", "/instagram"], function (req, res) {
  if (
    req.query["hub.mode"] == "subscribe" &&
    req.query["hub.verify_token"] == token
  ) {
    received_updates.unshift(req.body);

    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(400);
  }
});

app.post("/facebook", function (req, res) {
  console.log("Facebook request body:", req.body);

  if (!req.isXHubValid()) {
    console.log(
      "Warning - request header X-Hub-Signature not present or invalid"
    );
    res.sendStatus(401);
    return;
  }

  console.log("request header X-Hub-Signature validated");
  // Process the Facebook updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

app.post("/instagram", function (req, res) {
  sendMessage(req.body);
  console.log("Instagram request body:");
  console.log(req.body);
  // Process the Instagram updates here
  received_updates.unshift(req.body);
  res.sendStatus(200);
});

app.listen();

// message to sen
const sendMessage = async (objSender) => {
  console.log(process.env.AUTHTOKEN);
  let sendrobject = objSender.entry[0].changes[0].value;
  if (sendrobject.hasOwnProperty("messages")) {
    let message = sendrobject["messages"][0].text.body;
    let messageRespose = await GetResponseFromGPT(message);
    // call the api here to get the chat gpt endpoint
    let Receiver = sendrobject["messages"][0]["from"];
    fetch("https://graph.facebook.com/v17.0/110235552070956/messages", {
      method: "POST",
      //  body: `{ "messaging_product": "whatsapp", "to": ${Receiver}, "type": "template", "template": { "name": "hello_world", "language": { "code": "en_US" } } }`,
      body: `{ "messaging_product": "whatsapp", "to": ${Receiver}, "type": "text", "text": { "body": "${messageRespose}" } }`,

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AUTHTOKEN}`,
      },
    })
      .then((res) => res.json())
      .then((json) => console.log(json))
      .catch((err) => console.log(err));
  }
};

const GetResponseFromGPT = async (strMessage) => {
  //
  if (!strMessage.endsWith("?")) {
    strMessage = strMessage + "?";
  }
  // call the api here and return the response;
  return await createCompletion(strMessage);
};

async function createCompletion(strMessage) {
  try {
    const response = await openai.createCompletion({
      model: "ada:ft-digiphins-innovation-private-limited-2023-06-26-06-04-32",
      prompt: strMessage || "Does Digiphins provide IT solutions?",
      max_tokens: 50,
    });
    if (response.data) {
      console.log("choices: ", JSON.stringify(response.data.choices, null, 2));
      return response.data.choices[0].text;
    }
  } catch (err) {
    console.log("err: ", err);
  }
}
