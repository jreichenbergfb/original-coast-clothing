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

const Curation = require("./curation"),
  Order = require("./order"),
  Response = require("./response"),
  Care = require("./care"),
  Survey = require("./survey"),
  GraphApi = require("./graph-api"),
  i18n = require("../i18n.config");

module.exports = class Receive {
  constructor(user, webhookEvent) {
    this.user = user;
    this.webhookEvent = webhookEvent;
  }

  // Check if the event is a message or postback and
  // call the appropriate handler function
  handleMessage() {
    let event = this.webhookEvent;
    console.log('handleMessage', event.message);
    console.log('handleMessage event', JSON.stringify(event, null, 2));

    let responses;

    try {
      if (event.message) {
        let message = event.message;

        if (message.quick_reply) {
          responses = this.handleQuickReply();
        } else if (message.attachments) {
          responses = this.handleAttachmentMessage();
        } else if (message.text) {
          responses = this.handleTextMessage();
        }
      } else if (event.postback) {
        responses = this.handlePostback();
      } else if (event.referral) {
        responses = this.handleReferral();
      }
    } catch (error) {
      console.error(error);
      responses = {
        text: `An error has occured: '${error}'. We have been notified and \
        will fix the issue shortly!`
      };
    }

    console.log('handleMessage responses', responses);

    if (Array.isArray(responses)) {
      let delay = 0;
      for (let response of responses) {
        this.sendMessage(response, event.recipient.id, delay * 2000);
        delay++;
      }
    } else if (responses !== null) {
      this.sendMessage(responses, event.recipient.id);
    }
  }

  // Handles messages events with text
  handleTextMessage() {
    console.log(
      "Received text:",
      `${this.webhookEvent.message.text} for ${this.user.psid}`
    );

    let event = this.webhookEvent;

    // check greeting is here and is confident
    let greeting = this.firstEntity(event.message.nlp, "greetings");
    let message = event.message.text.trim().toLowerCase();

    let response;

    if (
      (greeting && greeting.confidence > 0.8) ||
      message.includes("start over")
    ) {
      response = Response.genNuxMessage(this.user);
    } else if (Number(message)) {
      response = Order.handlePayload("ORDER_NUMBER");
    } else if (message.includes("#")) {
      response = Survey.handlePayload("CSAT_SUGGESTION");
    } else if (message.includes(i18n.__("care.help").toLowerCase())) {
      let care = new Care(this.user, this.webhookEvent);
      response = care.handlePayload("CARE_HELP");
    } else {
      // let care = new Care(this.user, this.webhookEvent);
      // response = [
      //   Response.genText(
      //     i18n.__("fallback.any", {
      //       message: event.message.text
      //     })
      //   ),
      //   care.handlePayload('CARE_HELP')
      // ];
      response = null;
    }

    return response;
  }

  // Handles mesage events with attachments
  handleAttachmentMessage() {
    let response;

    // Get the attachment
    let attachment = this.webhookEvent.message.attachments[0];
    console.log("Received attachment:", `${attachment} for ${this.user.psid}`);

    response = Response.genQuickReply(i18n.__("fallback.attachment"), [
      {
        title: i18n.__("menu.help"),
        payload: "CARE_HELP"
      },
      {
        title: i18n.__("menu.start_over"),
        payload: "GET_STARTED"
      }
    ]);

    return response;
  }

  // Handles mesage events with quick replies
  handleQuickReply() {
    // Get the payload of the quick reply
    let payload = this.webhookEvent.message.quick_reply.payload;

    return this.handlePayload(payload);
  }

  // Handles postbacks events
  handlePostback() {
    let postback = this.webhookEvent.postback;
    // Check for the special Get Starded with referral
    let payload;
    if (postback.payload) {
      // Get the payload of the postback
      payload = postback.payload;
    } else if (postback.referral && postback.referral.type == "OPEN_THREAD") {
      payload = postback.referral.ref;
    }

    return this.handlePayload(payload.toUpperCase());
  }

  // Handles referral events
  handleReferral() {
    // Get the payload of the postback
    let payload = this.webhookEvent.referral.ref.toUpperCase();

    return this.handlePayload(payload);
  }

  handlePayload(payload) {
    console.log("Received Payload:", `${payload} for ${this.user.psid}`);

    let response;

    // Set the response based on the payload
    if (
      payload === "GET_STARTED" ||
      payload === "DEVDOCS" ||
      payload === "GITHUB"
    ) {
      response = Response.genNuxMessage(this.user);
    } else if (payload.includes("CURATION") || payload.includes("COUPON")) {
      let curation = new Curation(this.user, this.webhookEvent);
      response = curation.handlePayload(payload);
    } else if (payload.includes("CARE")) {
      let care = new Care(this.user, this.webhookEvent);
      response = care.handlePayload(payload);
    } else if (payload.includes("ORDER")) {
      response = Order.handlePayload(payload);
    } else if (payload.includes("CSAT")) {
      response = Survey.handlePayload(payload);
    } else if (payload.includes("CHAT-PLUGIN")) {
      response = [
        Response.genText(i18n.__("chat_plugin.prompt")),
        Response.genText(i18n.__("get_started.guidance")),
        Response.genQuickReply(i18n.__("get_started.help"), [
          {
            title: i18n.__("care.order"),
            payload: "CARE_ORDER"
          },
          // {
          //   title: i18n.__("care.billing"),
          //   payload: "CARE_BILLING"
          // },
          {
            title: i18n.__("care.returnPolicy"),
            payload: "CARE_RETURN_POLICY"
          },
          {
            title: i18n.__("care.stock"),
            payload: "CARE_STOCK"
          },
          {
            title: i18n.__("care.other"),
            payload: "CARE_OTHER"
          }
        ])
      ];
    } else if (payload.includes("BOOK_APPOINTMENT")) {
      response = [
        Response.genText(i18n.__("care.appointment")),
        // Response.genText(i18n.__("care.end"))
      ];
    } else {
      response = {
        text: `This is a default postback message for payload: ${payload}!`
      };
    }

    return response;
  }

  handlePrivateReply(type, object_id, pageId) {
    let welcomeMessage =
      i18n.__("get_started.welcome") +
      " " +
      i18n.__("get_started.guidance") +
      ". " +
      i18n.__("get_started.help");

    let response = Response.genQuickReply(welcomeMessage, [
      {
        title: i18n.__("menu.suggestion"),
        payload: "CURATION"
      },
      {
        title: i18n.__("menu.help"),
        payload: "CARE_HELP"
      }
    ]);

    let requestBody = {
      recipient: {
        [type]: object_id
      },
      message: response
    };

    GraphApi.callSendApi(requestBody, pageId);
  }

  sendMessage(response, pageId, delay = 0) {
    // Check if there is delay in the response
    if ("delay" in response) {
      delay = response["delay"];
      delete response["delay"];
    }

    // Construct the message body
    let requestBody = {
      recipient: {
        id: this.user.psid
      },
      message: response
    };

    // Check if there is persona id in the response
    if ("persona_id" in response) {
      let persona_id = response["persona_id"];
      delete response["persona_id"];

      requestBody = {
        recipient: {
          id: this.user.psid
        },
        message: response,
        // persona_id: persona_id
      };
      GraphApi.handoverToInbox(requestBody.recipient, persona_id, pageId);
    }

    console.log('sendMessage', requestBody, 'to page', pageId);

    setTimeout(() => GraphApi.callSendApi(requestBody, pageId), delay);
  }

  firstEntity(nlp, name) {
    return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
  }
};
