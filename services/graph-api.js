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

// Imports dependencies
const config = require("./config"),
  fetch = require("node-fetch"),
  { URL, URLSearchParams } = require("url");

module.exports = class GraphApi {
  static async callSendApi(requestBody, pageId) {
    let url = new URL(`${config.apiUrl}/me/messages`);
    url.search = new URLSearchParams({
      access_token: config.pageId2AccessToken[pageId]
    });
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      console.warn(`Could not send message.`, response);
    }
  }

  static async callMessengerProfileAPI(requestBody) {
    // Send the HTTP request to the Messenger Profile API

    console.log(`Setting Messenger Profile for app ${config.appId}`);
    config.pageIds.forEach(async id => {
      let url = new URL(`${config.apiUrl}/me/messenger_profile`);
      url.search = new URLSearchParams({
        access_token: config.pageId2AccessToken[id]
      });
      let response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      if (response.ok) {
        console.log(`Request sent.`);
      } else {
        console.warn(
          `Unable to callMessengerProfileAPI: ${response.statusText}`,
          await response.json()
        );
      }
    });
  }

  static async callSubscriptionsAPI(customFields) {
    // Send the HTTP request to the Subscriptions Edge to configure your webhook
    // You can use the Graph API's /{app-id}/subscriptions edge to configure and
    // manage your app's Webhooks product
    // https://developers.facebook.com/docs/graph-api/webhooks/subscriptions-edge
    console.log(
      `Setting app ${config.appId} callback url to ${config.webhookUrl}`
    );

    let fields =
      "messages, messaging_postbacks, messaging_optins, " +
      "message_deliveries, messaging_referrals";

    if (customFields !== undefined) {
      fields = fields + ", " + customFields;
    }

    console.log({ fields });

    let url = new URL(`${config.apiUrl}/${config.appId}/subscriptions`);
    url.search = new URLSearchParams({
      access_token: `${config.appId}|${config.appSecret}`,
      object: "page",
      callback_url: config.webhookUrl,
      verify_token: config.verifyToken,
      fields: fields,
      include_values: "true"
    });
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    if (response.ok) {
      console.log(`Request sent.`);
    } else {
      console.error(
        `Unable to callSubscriptionsAPI: ${response.statusText}`,
        await response.json()
      );
    }
  }

  static async callSubscribedApps(customFields) {
    // Send the HTTP request to subscribe an app for Webhooks for Pages
    // You can use the Graph API's /{page-id}/subscribed_apps edge to configure
    // and manage your pages subscriptions
    // https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps
    console.log(`Subscribing app ${config.appId} to pages ${config.pageIds}`);

    let fields =
      "messages, messaging_postbacks, messaging_optins, " +
      "message_deliveries, messaging_referrals";

    if (customFields !== undefined) {
      fields = fields + ", " + customFields;
    }

    config.pageIds.forEach(async id => {
      let url = new URL(`${config.apiUrl}/${id}/subscribed_apps`);
      url.search = new URLSearchParams({
        access_token: config.pageId2AccessToken[id],
        subscribed_fields: fields
      });
      console.log('Subscribing to fields', { fields });
      let response = await fetch(url, {
        method: "POST"
      });
      if (response.ok) {
        console.log(`Request sent for ${id}`);
      } else {
        console.error(
          `Unable to callSubscribedApps for page ${id}: ${response.statusText}`,
          await response.json()
        );
      }
    });
  }

  static async getUserProfile(senderIgsid) {
    let url = new URL(`${config.apiUrl}/${senderIgsid}`);
    url.search = new URLSearchParams({
      access_token: config.pageAccesToken,
      //fields: "first_name, last_name, gender, locale, timezone"
      fields: "first_name, last_name"
    });
    let response = await fetch(url);
    if (response.ok) {
      let userProfile = await response.json();
      return {
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        // gender: userProfile.gender,
        // locale: userProfile.locale,
        // timezone: userProfile.timezone
      };
    } else {
      console.warn(
        `Could not load profile for ${senderIgsid}: ${response.statusText}`,
        await response.json()
      );
      return null;
    }
  }

  static async getPersonaAPI() {
    // Send the POST request to the Personas API
    console.log(`Fetching personas for app ${config.appId}`);
    const personaResults = [];
    for (let i=0; i=config.pageIds.length; i++) {
      let url = new URL(`${config.apiUrl}/me/personas`);
      url.search = new URLSearchParams({
        access_token: config.pageId2AccessToken[config.pageIds[i]]
      });
      let response = await fetch(url);
      if (response.ok) {
        let body = await response.json();
        personaResults.push(body.data);
      } else {
        console.warn(
          `Unable to fetch personas for ${config.appId}: ${response.statusText}`,
          await response.json()
        );
        personaResults.push(null);
      }
    }
    return personaResults;
  }

  static async postPersonaAPI(name, profile_picture_url) {
    let requestBody = {
      name,
      profile_picture_url
    };
    console.log(`Creating a Persona for app ${config.appId}`);
    console.log({ requestBody });
    let url = new URL(`${config.apiUrl}/me/personas`);
    url.search = new URLSearchParams({
      access_token: config.pageAccesToken
    });
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    if (response.ok) {
      console.log(`Request sent.`);
      let json = await response.json();
      return json.id;
    } else {
      console.error(
        `Unable to postPersonaAPI: ${response.statusText}`,
        await response.json()
      );
    }
  }

  // static async callNLPConfigsAPI() {
  //   // Send the HTTP request to the Built-in NLP Configs API
  //   // https://developers.facebook.com/docs/graph-api/reference/page/nlp_configs/

  //   console.log(`Enable Built-in NLP for Pages ${config.pageIds}`);

  //   let url = new URL(`${config.apiUrl}/me/nlp_configs}/me/nlp_configs`);
  //   url.search = new URLSearchParams({
  //     access_token: config.pageAccesToken,
  //     nlp_enabled: true
  //   });
  //   let response = await fetch(url, {
  //     method: "POST"
  //   });
  //   if (response.ok) {
  //     console.log(`Request sent.`);
  //   } else {
  //     console.error(`Unable to activate built-in NLP: ${response.statusText}`);
  //   }
  // }

  static async handoverToInbox(recipient, persona_id, pageId) {
    let url = new URL(`${config.apiUrl}/me/pass_thread_control`);
    url.search = new URLSearchParams({
      access_token: config.pageId2AccessToken[pageId]
    });
    const requestBody = {
      recipient: recipient,
      target_app_id: 263902037430900,
      metadata: 'This thread passed to a live agent from the bot',
    };
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    if (response.ok) {
      console.log(`Success: pass_thread_control for pageId ${pageId}, persona_id ${persona_id}`, response.statusText, await response.json());
    } else {
      console.warn(
        `Unable to pass_thread_control for pageId ${pageId}: ${response.statusText}`,
        await response.json()
      );
    }

    // for debugging, list the secondary receivers
    const secondaryReceiversUrl = new URL(`${config.apiUrl}/me/secondary_receivers`);
    secondaryReceiversUrl.search = new URLSearchParams({
      access_token: config.pageId2AccessToken[pageId],
      fields: 'id,name'
    });
    let secondaryReceiversListResponse = await fetch(secondaryReceiversUrl);
    if (secondaryReceiversListResponse.ok) {
      console.log(`Success: secondary_receivers ${secondaryReceiversListResponse.statusText}`, await secondaryReceiversListResponse.json());
    } else {
      console.warn(
        `Unable to list secondary_receivers for pageId ${pageId}: ${secondaryReceiversListResponse.statusText}`,
        await secondaryReceiversListResponse.json()
      );
    }
  }
};
