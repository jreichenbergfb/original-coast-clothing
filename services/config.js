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

// Use dotenv to read .env vars into Node
require("dotenv").config();

// Required environment variables
const ENV_VARS = [
  "PAGE_IDS",
  "APP_ID",
  "APP_SECRET",
  "VERIFY_TOKEN",
  "APP_URL",
  "SHOP_URL"
];

const pageId2AccessToken = {};
const pageIds = process.env.PAGE_IDS.split(',');
pageIds.forEach((id, idx) => {
  pageId2AccessToken[id] = process.env[`PAGE_ACCESS_TOKEN_${idx + 1}`];
});

module.exports = {
  // Messenger Platform API
  apiDomain: "https://graph.facebook.com",
  apiVersion: "v13.0",

  // Page and Application information
  pageIds: pageIds,
  appId: process.env.APP_ID,
  appSecret: process.env.APP_SECRET,
  verifyToken: process.env.VERIFY_TOKEN,

  pageId2AccessToken: pageId2AccessToken,

  // URL of your app domain
  appUrl: process.env.APP_URL,

  // URL of your website
  shopUrl: process.env.SHOP_URL,

  // Persona IDs
  personas: {},

  // Preferred port (default to 3000)
  port: process.env.PORT || 3000,

  // Base URL for Messenger Platform API calls
  get apiUrl() {
    return `${this.apiDomain}/${this.apiVersion}`;
  },

  // URL of your webhook endpoint
  get webhookUrl() {
    return `${this.appUrl}/webhook`;
  },

  get newPersonas() {
    return [
      {
        name: "Reed",
        picture: `${this.appUrl}/personas/sales.jpg`
      },
      {
        name: "Val",
        picture: `${this.appUrl}/personas/billing.jpg`
      },
      {
        name: "Alma",
        picture: `${this.appUrl}/personas/order.jpg`
      },
      {
        name: "Alma",
        picture: `${this.appUrl}/personas/care.jpg`
      }
    ];
  },

  pushPersona(persona) {
    this.personas[persona.name] = persona.id;
  },

  get personaSales() {
    let id = this.personas["Reed"] || process.env.PERSONA_SALES;
    return {
      name: "Reed",
      id: id
    };
  },

  get personaBilling() {
    let id = this.personas["Val"] || process.env.PERSONA_BILLING;
    return {
      name: "Val",
      id: id
    };
  },

  get personaOrder() {
    let id = this.personas["Reed"] || process.env.PERSONA_ORDER;
    return {
      name: "Reed",
      id: id
    };
  },

  get personaReturns() {
    let id = this.personas["Reed"] || process.env.PERSONA_RETURNS;
    return {
      name: "Reed",
      id: id
    };
  },

  get personaStock() {
    let id = this.personas["Alma"] || process.env.PERSONA_STOCK;
    return {
      name: "Alma",
      id: id
    };
  },

  get personaCare() {
    let id = this.personas["Alma"] || process.env.PERSONA_CARE;
    return {
      name: "Alma",
      id: id
    };
  },

  get whitelistedDomains() {
    return [this.appUrl, this.shopUrl];
  },

  checkEnvVariables: function() {
    ENV_VARS.forEach(function(key) {
      if (!process.env[key]) {
        console.warn("WARNING: Missing the environment variable " + key);
      } else {
        // Check that urls use https
        if (["APP_URL", "SHOP_URL"].includes(key)) {
          const url = process.env[key];
          if (!url.startsWith("https://")) {
            console.warn(
              "WARNING: Your " + key + ' does not begin with "https://"'
            );
          }
        }
      }
    });
  }
};
