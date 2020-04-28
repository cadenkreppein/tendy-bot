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

sendErrorMessage = (msg) => {
  msg.channel.send(`Unrecognized command. Type '!gbp help' for a list of commands.`);
};

client.on('message', msg => {
  if (msg.content.startsWith('!gbp')) {
    var params = msg.content.split(' ');
    if (params.length === 0) {
      sendErrorMessage(msg);
    }
    var command = params[0];

    if (command === 'give') {
      var mentions = msg.mentions;
      for (var m in mentions) {
        console.log(m);
      }
    }

    if (command === 'help') {
      msg.channel.send(`Type '!gbp' followed by any of the following commands to use your Good Boy Points.

Good Boy Points Commands:
balance: Check how many GBP you have. (FREE)
tendies: Buy some tendies. (50 GBP)
mussy: Buy some honey mustard. (25 GBP)
ree: Have this bot elicit a mighty REEEEEEEEEEEEEEEEEEEEEE (150 GBP)`);
    }
    
  }
})

client.login(token);
