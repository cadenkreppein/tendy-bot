const Discord = require('discord.js')
const moment = require('moment');
const client = new Discord.Client()
const { token, dbHost, dbUser, dbPass, dbInstance } = require('./config.json')
const mysql = require('mysql');

const db = mysql.createConnection({
  host: dbHost,
  user: dbUser,
  password: dbPass,
  database: dbInstance,
  debug: true
});

db.connect(err => {
  if (err) {
    throw err;
  }
  console.log('Connected to DB!');
});

getBalance = async (userId) => {
  var query = `SELECT * FROM GBP_Balances WHERE UserId = ?`
  return new Promise((resolve, reject) => {
    db.query(query, userId, (err, rows) => {
      if (err) {
        reject('An error occured');
      }
      var existingBalance;
      if (!rows || rows.length === 0) {
        existingBalance = 0;
      } else {
        existingBalance = rows[0].Points;
      }
      resolve(existingBalance);
    });
  });
}

changeBalance = async (userId, amount, reason) => {
  var existingBalance = await getBalance(userId);
  var query = `REPLACE INTO GBP_Balances SET ?`;
  var newAmount = existingBalance + amount;
  if (newAmount < 0) {
    newAmount = 0;
  }
  let payload = { UserId: userId, Points: newAmount };
  db.query(query, payload);
  query = `INSERT INTO GBP_Logs SET ?`;
  payload = { UserId: userId, PointsChange: amount, Reason: reason.length > 0 ? reason : 'Unspecified reason.', Timestamp: new Date() };
  db.query(query, payload);
}

getLogs = async (userId) => {
  var query = `SELECT * FROM GBP_Logs WHERE UserId = ? ORDER BY Timestamp DESC LIMIT 0,5`;
  return new Promise((resolve, reject) => {
    db.query(query, userId, (err, rows) => {
      if (err) {
        reject('An error occured');
      }
      resolve(rows);
    });
  });
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
});

sendErrorMessage = (msg) => {
  msg.channel.send(`Unrecognized command. Type \`!gbp help\` for a list of commands.`);
}

client.on('message', async msg => {
  if (msg.content.startsWith('!gbp')) {
    var params = msg.content.split(' ').slice(1);
    if (params.length === 0) {
      sendErrorMessage(msg);
      return;
    }
    var command = params[0];
    if (params.length > 1) {
      params = params.slice(1);
    } else {
      params = [];
    }

    // Commands
    // Give
    if (command === 'give') {
      if (msg.author.id !== '203694377648914432') {
        msg.reply('No you dingus, only Caden can give GBP!');
      }
      var amount = 0;
      var amountFound = false;
      var multipleAmountsFound = false;
      var reason = [];
      for (var param of params) {
        let parsed = parseInt(param);
        if (!param.startsWith('<@!') && !isNaN(parsed)) {
          if (amountFound && !multipleAmountsFound) {
            msg.channel.send('Multiple amounts detected, please input only one amount.');
            multipleAmountsFound = true;
          } else {
            amount = parsed;
            amountFound = true;
          }
        } else if (!param.startsWith('<@!')) {
          reason.push(param);
        }
      }
      var mentions = msg.mentions.users.keys();
      if (mentions.length === 0) {
        msg.channel.send('No users were specified to receive GBP.');
      } else if (amountFound && !multipleAmountsFound) {
        for (var userId of mentions) {
          changeBalance(userId, amount, reason.join(' '));
        }
        msg.channel.send('GBP awarded.');
      } else if (!amountFound) {
        msg.channel.send('No amount was specified.');
      }
    // Take
    } else if (command === 'take') {
      if (msg.author.id !== '203694377648914432') {
        msg.reply('Only the great and mighty Caden may take GBP.');
      }
      var amount = 0;
      var amountFound = false;
      var multipleAmountsFound = false;
      var reason = [];
      for (var param of params) {
        let parsed = parseInt(param);
        if (!param.startsWith('<@!') && !isNaN(parsed)) {
          if (amountFound) {
            msg.channel.send('Multiple amounts detected, please input only one amount.');
            multipleAmountsFound = true;
          } else {
            amount = parsed;
            amountFound = true;
          }
        } else if (!param.startsWith('<@!')) {
          reason.push(param);
        }
      }
      var mentions = msg.mentions.users.keys();
      if (mentions.length === 0) {
        msg.channel.send('No users were specified to take GBP from.');
      } else if (amountFound && !multipleAmountsFound) {
        for (var userId of mentions) {
          changeBalance(userId, -amount, reason.join(' '));
        }
        msg.channel.send('GBP taken.');
      } else {
        msg.channel.send('No amount was specified.');
      }
    // Balance
    } else if (command === 'balance') {
      var mentions = Array.from(msg.mentions.users.keys());
      if (mentions.length === 0) {
        var balance = await getBalance(msg.author.id);
        if (balance === 0) {
          msg.channel.send(`<@!${msg.author.id}>, you have ${balance} GBP. Earn points by being a good boi!`);
        } else {
          msg.channel.send(`<@!${msg.author.id}>, you have ${balance} GBP. What a good boi!`);
        }
      } else if (mentions.length === 1) {
        var authorBalance = await getBalance(msg.author.id);
        if (authorBalance < 10) {
          msg.channel.send(`<@!${msg.author.id}> you do not have sufficient GBP for this command.`);
        } else {
          var otherBalance = await getBalance(mentions[0]);
          changeBalance(msg.author.id, -10, 'Checked another user\'s balance.');
          if (otherBalance === 0) {
            msg.channel.send(`<@!${mentions[0]}> has ${otherBalance} GBP. They can earn points by being a good boi!`);
          } else {
            msg.channel.send(`<@!${mentions[0]}> has ${otherBalance} GBP. What a good boi!`);
          }
        }
      } else {
        msg.channel.send('Currently, you can only check balances for yourself or one other user.');
      }
    // Logs
    } else if (command === 'logs') {
      var mentions = Array.from(msg.mentions.users.keys());
      if (mentions.length === 0) {
        var logs = await getLogs(msg.author.id);
        if (logs.length === 0) {
          msg.channel.send(`<@!${msg.author.id}>, you have no logs yet. Try being a good boi to get some points!`);
        } else {
          var logMessage = `<@!${msg.author.id}> here are your ${logs.length} most recent logs:`;
          for (var log of logs) {
            logMessage += `\n**[${moment(log.Timestamp).format('M/D/YYYY h:mm:ss A')}]:** ${log.Reason} *(${log.PointsChange} GBP)*`;
          }
          msg.channel.send(logMessage);
        }
      } else if (mentions.length === 1) {
        var logs = await getLogs(mentions[0]);
        if (logs.length === 0) {
          msg.channel.send(`<@!${mentions[0]}>, you have no logs yet. Try being a good boi to get some points!`);
        } else {
          var logMessage = `Here are the ${logs.length} most recent logs for <@!${mentions[0]}>:`;
          for (var log of logs) {
            logMessage += `\n**[${moment(log.Timestamp).format('M/D/YYYY h:mm:ss A')}]:** ${log.Reason} *(${log.PointsChange} GBP)*`;
          }
          msg.channel.send(logMessage);
        }
      } else {
        msg.channel.send('Currently, you can only check balances for yourself or one other user.');
      }
    // Tendies
    } else if (command === 'tendies') {
      var balance = await getBalance(msg.author.id);
      if (balance < 50) {
        msg.channel.send(`<@!${msg.author.id}> you do not have sufficient GBP for this command.`);
      } else {
        changeBalance(msg.author.id, -50, 'Bought some tendies.');
        msg.channel.send(`<@!${msg.author.id}> here are your tendies: 🍗🍗🍗 Thank you for being such a good boi!`);
      }
    // Mussy
    } else if (command === 'mussy') {
      var balance = await getBalance(msg.author.id);
      if (balance < 25) {
        msg.channel.send(`<@!${msg.author.id}> you do not have sufficient GBP for this command.`);
      } else {
        // ...give mussy?
        changeBalance(msg.author.id, -25, 'Bought some honey mussy.');
        msg.channel.send(`<@!${msg.author.id}> here is your honey mussy: 🍯 Thank you for being such a good boi!`);
      }
    // REEEEEEEE
    } else if (command === 'ree') {
      var balance = await getBalance(msg.author.id);
      if (balance < 150) {
        msg.channel.send(`<@!${msg.author.id}> you do not have sufficient GBP for this command.`);
      } else {
        changeBalance(msg.author.id, -150, 'Bought a "REEEEEEE".');
        msg.channel.send('REEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE');
      }
    // Help
    } else if (command === 'help') {
      msg.channel.send(`Type \`!gbp\` followed by any of the following commands to use your Good Boi Points.

**Good Boi Points Commands**
\`balance\`: Check how many GBP you have. (FREE)
\`balance <mention>\`: Check how many GBP another user has. (10 GBP)
\`logs <mention>\`: Check the 5 most recent GBP balance change logs for the mentioned user. (10 GBP)
\`tendies\`: Buy some tendies. (50 GBP)
\`mussy\`: Buy some honey mustard. (25 GBP)
\`ree\`: Have this bot elicit a mighty REEEEEEEEEEEEEEEEEEEEEE (150 GBP)`);
    } else {
      sendErrorMessage(msg);
    }
  }
})

client.login(token);
