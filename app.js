/**
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */
var openai = require("./api.js");
var bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const cors = require("cors");
var express = require("express");
require("dotenv").config();
// get the message models

const { Thread, Participant, Message } = require("./Model/Message.js");

var app = express();
var xhub = require("express-x-hub");
let PORT = 5000;
app.set("port", process.env.PORT || 5000);
app.listen(app.get("port"));

app.use(
  cors({
    origin: "*",
    credentials: true, // allow sending cookies across domains
    exposedHeaders: ["*"],
    allowedHeaders: ["*"],
  })
);
app.use(xhub({ algorithm: "sha1", secret: process.env.APP_SECRET }));
app.use(bodyParser.json());

var token = process.env.TOKEN || "token";
var received_updates = [];

var lstRidersync = [];

// object that stores authtoken

let objClientToken = {
  data: "AUTHTOKEN",
};

app.get("/", function (req, res) {
  console.log(req);
  // res.send("<pre>" + JSON.stringify(received_updates, null, 2) + "</pre>");
  res.send("<pre>" + JSON.stringify(lstRidersync, null, 2) + "</pre>");
});

app.get(["/facebook", "/instagram", "/riderdata"], function (req, res) {
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

app.post("/riderdata", function (req, res) {
  lstRidersync.unshift(req.body);
  res.sendStatus(200);
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
  //sendMessage(req.body);
  SaveMessage(req.body);
  console.log("Instagram request body:");
  console.log(req.body);
  // Process the Instagram updates here
  received_updates.unshift(req.body);
  // save the data in the db

  // publish the mesage to the client.

  res.sendStatus(200);
});

// get all the threads based on the client id.
app.get("/getthreads/:clientId", (req, res) => {
  //
  const { clientId } = req.params;
  // Thread.find({ clientId: clientId })
  Thread.find()
    .select({ _id: 1, clientId: 1, unreadCount: 1, id: 1 })
    .then((ThreadExists) => {
      if (ThreadExists) {
        return res.status(200).json(Object.values(ThreadExists));
      }
    });
});

// get the thread based on the thread id
app.get("/getthread/:threadId", (req, res) => {
  const { threadId } = req.params;
  Thread.findOne({ _id: threadId })
    .then((ThreadExists) => {
      if (ThreadExists) {
        return res.status(200).json({ ...ThreadExists._doc });
      }
    })
    .catch((ex) => {
      return res.status(400).json({ ...ex });
    });
});

app.post("/message", async function (req, res) {
  let response = await sendMessageToClient(req.body);
  res.status(200).json(response);
});

//app.listen();

mongoose
  .connect(process.env.MONGO_URL)
  .then((result) => {
    app
      .listen(PORT, function () {
        console.log("The SERVER HAS STARTED ON PORT: " + PORT);
      })
      //Fix the Error EADDRINUSE
      .on("error", function (err) {
        process.once("SIGUSR2", function () {
          process.kill(process.pid, "SIGUSR2");
        });
        process.on("SIGINT", function () {
          // this is only called on ctrl+c, not restar
          process.kill(process.pid, "SIGINT");
        });
      });
  })
  .catch((err) => {
    console.log(err);
  });

let interatviemessage = {
  messaging_product: "whatsapp",
  to: "8296220239",
  type: "interactive",
  interactive: {
    type: "list",
    header: {
      type: "text",
      text: "your-header-content",
    },
    body: {
      text: "your-text-message-content",
    },
    footer: {
      text: "your-footer-content",
    },
    action: {
      button: "cta-button-content",
      sections: [
        {
          title: "your-section-title-content",
          rows: [
            {
              id: "unique-row-identifier",
              title: "row-title-content",
              description: "row-description-content",
            },
          ],
        },
        {
          title: "your-section-title-content",
          rows: [
            {
              id: "unique-row-identifier",
              title: "row-title-content",
              description: "row-description-content",
            },
          ],
        },
      ],
    },
  },
};

// message to sen
const sendMessage = async (objSender) => {
  console.log(process.env.AUTHTOKEN);
  let sendrobject = objSender.entry[0].changes[0].value;
  if (sendrobject.hasOwnProperty("messages")) {
    let message = sendrobject["messages"][0].text.body;
    let messageRespose = await GetResponseFromGPT(message);
    // call the api here to get the chat gpt endpoint
    // let Receiver = sendrobject["messages"][0]["from"];
    let Receiver = "918296220239";
    fetch("https://graph.facebook.com/v17.0/110235552070956/messages", {
      method: "POST",
      //body: `{ "messaging_product": "whatsapp", "to": ${Receiver}, "type": "template", "template": { "name": "hello_world", "language": { "code": "en_US" } } }`,
      body: `{ "messaging_product": "whatsapp", "to": ${Receiver}, "type": "text", "text": { "body": "${messageRespose}" } }`,
      //       body: `{ "messaging_product": "whatsapp", "to": ${Receiver}, "type": "interactive", "interactive":
      //       {type: "list",
      //       "body": { text: "your-text-message-content"},
      //       action: {
      //         button: "cta-button-content",
      //         sections:[
      // {
      //   title: "hello",
      //   rows: [
      //     {
      //       id: "unique-row-identifier",
      //       title: "row-title-content",
      //       description: "row-description-content",
      //     },
      //   ],

      // }

      //         ]
      //       }
      //     } }`,
      //body: interatviemessage,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env[objClientToken["data"]]}`,
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

//TODO:  save message to the db

// 1. che if the thread exists or not
// if not create new thread
// else update the existing thread.

const SaveMessage = async (objMessage) => {
  //
  let sendrobject = objMessage.entry[0].changes[0].value;
  if (sendrobject.hasOwnProperty("messages")) {
    let message = sendrobject["messages"][0].text.body;
    let strSender = sendrobject["messages"][0].from;
    let iclient = sendrobject.metadata.display_phone_number;
    // call the api here to get the chat gpt endpoint
    // let Receiver = objMessage["messages"][0]["from"];
    let Receiver = "918296220239";
    // for the objet and save here

    // CHECK IF THE TREAD ALREADY EXISTS OR NOT ?

    Thread.findOne({ id: strSender, clientId: iclient })
      .then((objThread) => {
        let objNewMessage = new Message({
          id: uuidv4(),
          attachments: [],
          body: message,
          contentType: "text",
          senderId: strSender,
        });
        if (objThread) {
          // will hVE TO UPDATE THE RECORD HERE.
          let mes = [...objThread.messages, objNewMessage];
          console.log(JSON.stringify(mes, null, 2));

          // Thread.findByIdAndUpdate(
          //   { _id: objThread._id },
          //   { clientId: "123456" }
          // );

          updateRecord(objThread._id, mes);
          return;
        }
        //CREAET NEW RECORD HERE.
        // Thread, Participant, Message

        let objparticipant = new Participant({
          //id: "5e86809283e28b96d2d38537",
          id: uuidv4(),
          avatar: "/static/images/avatars/avatar_6.png",
          name: "Katarina Smith",
          username: "Katarina Smith",
        });

        let objNewTread = new Thread({
          id: strSender,
          clientId: iclient,
          messages: [objNewMessage],
          participants: [objparticipant],
          type: "GROUP",
          unreadCount: 2,
        });

        try {
          let res = objNewTread.save();
        } catch (err) {
          console.log(err);
        }
      })
      .catch((err) => {
        // If there was an error checking the referral code, return an error response

        // Thread, Participant, Message
        let objNewMessage = new Message({
          id: uuidv4(),
          attachments: [],
          body: message,
          contentType: "text",
          senderId: "",
        });

        let objparticipant = new Participant({
          // id: "5e86809283e28b96d2d38537",
          id: uuidv4(),
          avatar: "/static/images/avatars/avatar_6.png",
          name: "Katarina Smith",
          username: "Katarina Smith",
        });

        let objNewTread = new Thread({
          id: strSender,
          clientId: iclient,
          messages: [objNewMessage],
          participants: [objparticipant],
          type: "GROUP",
          unreadCount: 2,
        });

        try {
          let res = objNewTread.save();
        } catch (err) {
          console.log(err);
        }

        return;
      });
  }
};

const updateRecord = async (data, mes) => {
  return await Thread.findByIdAndUpdate(
    { _id: data },
    { messages: mes },
    { new: true }
  );
  //
};

// message to sen
const sendMessageToClient = (objMessage) => {
  let messageRespose = objMessage.body;
  let iclient = objMessage.clientId;
  let threadId = objMessage.threadId;

  // call the api here to get the chat gpt endpoint
  // let Receiver = sendrobject["messages"][0]["from"];
  // let Receiver = "918296220239";
  let Receiver = objMessage.receiver;
  return fetch("https://graph.facebook.com/v17.0/110235552070956/messages", {
    method: "POST",
    //body: `{ "messaging_product": "whatsapp", "to": ${Receiver}, "type": "template", "template": { "name": "hello_world", "language": { "code": "en_US" } } }`,
    body: `{ "messaging_product": "whatsapp", "to": ${Receiver}, "type": "text", "text": { "body": "${messageRespose}" } }`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AUTHTOKEN}`,
    },
  })
    .then((res) => res.json())
    .then((json) => {
      console.log(json);
      // make the db entry here for the message sent
      return Thread.findOne({ _id: threadId }).then((objThread) => {
        let objNewMessage = new Message({
          id: uuidv4(),
          attachments: [],
          body: messageRespose,
          contentType: "text",
          senderId: iclient,
        });
        if (objThread) {
          // will hVE TO UPDATE THE RECORD HERE.
          let mes = [...objThread.messages, objNewMessage];
          return updateRecord(objThread._id, mes);
        }
      });
    })
    .catch((err) => console.log(err));
};
