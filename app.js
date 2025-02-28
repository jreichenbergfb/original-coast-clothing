/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger For Original Coast Clothing
 * https://developers.facebook.com/docs/messenger-platform/getting-started/sample-apps/original-coast-clothing
 */

"use strict";

// Import dependencies and set up http server
const express = require("express"),
  { urlencoded, json } = require("body-parser"),
  crypto = require("crypto"),
  path = require("path"),
  Receive = require("./services/receive"),
  GraphApi = require("./services/graph-api"),
  User = require("./services/user"),
  config = require("./services/config"),
  i18n = require("./i18n.config"),
  app = express();

var users = {};

// Parse application/x-www-form-urlencoded
app.use(
  urlencoded({
    extended: true
  })
);

// Parse application/json. Verify that callback came from Facebook
app.use(json({ verify: verifyRequestSignature }));

// Serving static files in Express
app.use(express.static(path.join(path.resolve(), "public")));

// Set template engine in Express
app.set("view engine", "ejs");

// Respond with index file when a GET request is made to the homepage
app.get("/", function(_req, res) {
  res.render("index");
});

// Add support for GET requests to our webhook
app.get("/webhook", (req, res) => {
  // Parse the query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];
  console.log('hub.challenge', challenge);
  // Check if a token and mode is in the query string of the request
  if (mode && token) {
    // Check the mode and token sent is correct
    if (mode === "subscribe" && token === config.verifyToken) {
      // Respond with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Respond with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

// Create the endpoint for your webhook
app.post("/webhook", (req, res) => {
  let body = req.body;

  console.log(`\u{1F7EA} Received webhook:`);
  console.dir(body, { depth: null });

  // Check if this is an event from a page subscription
  if (body.object === "page") {
    // Returns a '200 OK' response to all requests
    res.status(200).send("EVENT_RECEIVED");

    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(async function(entry) {
      if ("changes" in entry) {
        // Handle Page Changes event
        let receiveMessage = new Receive();
        if (entry.changes[0].field === "feed") {
          let change = entry.changes[0].value;
          switch (change.item) {
            case "post":
              return receiveMessage.handlePrivateReply(
                "post_id",
                change.post_id,
                entry.id
              );
            case "comment":
              return receiveMessage.handlePrivateReply(
                "comment_id",
                change.comment_id,
                entry.id
              );
            default:
              console.warn("Unsupported feed change type.");
              return;
          }
        }
      }

      // Iterate over webhook events - there may be multiple
      entry.messaging.forEach(async function(webhookEvent) {
        // Discard uninteresting events
        if ("read" in webhookEvent) {
          console.log("Got a read event");
          return;
        } else if ("delivery" in webhookEvent) {
          console.log("Got a delivery event");
          return;
        } else if (webhookEvent.message && webhookEvent.message.is_echo) {
          console.log(
            "Got an echo of our send, mid = " + webhookEvent.message.mid
          );
          return;
        }

        // Get the sender PSID
        let senderPsid = webhookEvent.sender.id;

        if (!(senderPsid in users)) {
          // First time seeing this user
          let user = new User(senderPsid);
          users[senderPsid] = user;
          let userProfile = await GraphApi.getUserProfile(senderPsid);
          if (userProfile) {
            user.setProfile(userProfile);
            console.log(`Created new user profile:`);
            console.log({ user });
          }
        }
        i18n.setLocale(users[senderPsid].locale);
        let receiveMessage = new Receive(users[senderPsid], webhookEvent);
        return receiveMessage.handleMessage();
      });
    });
  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Set up your App's Messenger Profile
app.get("/profile", (req, res) => {
  let token = req.query["verify_token"];
  let mode = req.query["mode"];

  if (!config.webhookUrl.startsWith("https://")) {
    res.status(200).send("ERROR - Need a proper API_URL in the .env file");
  }
  var Profile = require("./services/profile.js");
  Profile = new Profile();

  // Check if a token and mode is in the query string of the request
  if (mode && token) {
    if (token === config.verifyToken) {
      if (mode == "webhook" || mode == "all") {
        Profile.setWebhook();
        res.write(
          `<p>&#9989; Set app ${config.appId} call to ${config.webhookUrl}</p>`
        );
      }
      if (mode == "profile" || mode == "all") {
        Profile.setThread();
        res.write(
          `<p>&#9989; Set Messenger Profile of Pages ${config.pageIds}</p>`
        );
      }
      if (mode == "personas" || mode == "all") {
        // Profile.setPersonas();
        // res.write(`<p>&#9989; Set Personas for ${config.appId}</p>`);
        // res.write(
        //   "<p>Note: To persist the personas, add the following variables \
        //   to your environment variables:</p>"
        // );
        // res.write("<ul>");
        // res.write(`<li>PERSONA_BILLING = ${config.personaBilling.id}</li>`);
        // res.write(`<li>PERSONA_CARE = ${config.personaCare.id}</li>`);
        // res.write(`<li>PERSONA_ORDER = ${config.personaOrder.id}</li>`);
        // res.write(`<li>PERSONA_SALES = ${config.personaSales.id}</li>`);
        // res.write("</ul>");
      }
      if (mode == "nlp" || mode == "all") {
        // GraphApi.callNLPConfigsAPI();
        // res.write(
        //   `<p>&#9989; Enabled Built-in NLP for Pages ${config.pageIds}</p>`
        // );
      }
      if (mode == "domains" || mode == "all") {
        Profile.setWhitelistedDomains();
        res.write(
          `<p>&#9989; Whitelisted domains: ${config.whitelistedDomains}</p>`
        );
      }
      if (mode == "private-reply") {
        Profile.setPageFeedWebhook();
        res.write(`<p>&#9989; Set Page Feed Webhook for Private Replies.</p>`);
      }
      res.status(200).end();
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else {
    // Returns a '404 Not Found' if mode or token are missing
    res.sendStatus(404);
  }
});

// Verify that the callback came from Facebook.
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    console.warn(`Couldn't find "x-hub-signature" in headers.`);
  } else {
    var elements = signature.split("=");
    var signatureHash = elements[1];
    var expectedHash = crypto
      .createHmac("sha1", config.appSecret)
      .update(buf)
      .digest("hex");
    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

// Check if all environment variables are set
config.checkEnvVariables();

config.pushPersona({
  name: 'Alma',
  id: 3
});

config.pushPersona({
  name: 'Reed',
  id: 2
});

config.pushPersona({
  name: 'Val',
  id: 1
});

// Listen for requests :)
var listener = app.listen(config.port, function() {
  console.log(`The app is listening on port ${listener.address().port}`);
  if (
    Object.keys(config.personas).length == 0 &&
    config.appUrl &&
    config.verifyToken
  ) {
    console.log(
      "Is this the first time running?\n" +
        "Make sure to set the both the Messenger profile, persona " +
        "and webhook by visiting:\n" +
        config.appUrl +
        "/profile?mode=all&verify_token=" +
        config.verifyToken
    );
  }

  if (config.pageIds) {
    console.log("Test your app by messaging one of the connected pages:");
    config.pageIds.forEach(id => {
      console.log(`https://m.me/${id}`);
    });
  }
});
