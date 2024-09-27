const express = require('express');
const DiscordOauth2 = require("discord-oauth2");
const crypto = require('crypto');
const oauth = new DiscordOauth2({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT,
});

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const db = require('./db');

const app = express.Router();

const dayjs = require('dayjs');
var relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);

const { Webhook } = require('discord-webhook-node');
const hook = new Webhook(process.env.ADMIN_HOOK);

hook.send(`<@${process.env.ADMIN_ID}> :blue_square: **BOOT** - Dashboard started`);

module.exports = app;