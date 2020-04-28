const Discord = require('discord.js')
const client = new Discord.Client()
const { token, dbHost, dbUser, dbPass, dbInstance } = require('./config.json')
const mysql = require('mysql');

const db = mysql.createConnection({
  host: dbHost,
  user: dbUser,
  password: dbPass,
  database: dbInstance
});

db.connect(err => {
  if (err) {
    throw err;
  }
  console.log('Connected to DB!');
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on('message', msg => {
  if (msg.content.startsWith('!gbp ')) {
    msg.channel.send('Hello there!');
  }
})

client.login(token);
