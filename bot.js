//Import required dependancies
const fs = require("fs");
const extend = require("extend");
const readline = require("readline").createInterface({input:process.stdin,output:process.stdout});
const Discord = require("discord.js");
require("./commands.js");

//Load JSON config files
console.log("Loading config...");
global.config = JSON.parse(fs.readFileSync("./config.json")); //require("./config_internal.js");
extend(false, global.config, JSON.parse(fs.readFileSync("package.json")));

console.log("Loading guild preferences...");
global.guildPrefs = JSON.parse(fs.readFileSync("./guildPrefs.json"));

//Initiate bot
const client = new Discord.Client();
client.queues = [];

//When bot connects to Discord's servers
client.on("ready", () => {
    console.log(`Bot initiated. Type '?' for command line commands, or type ${config.default_command_prefix}help in discord for bot commands.`);

    if (config.owner_id != "" && config.greet_owner)
        setTimeout(() => {
            client.fetchUser(config.owner_id).then(user => {
                user.sendMessage(`Greetings, ${user.username}! I'm Ciel, your new bot for Discord! From here, you can configure me and manage things like user permissions without digging through files!`);
            });
        }, 3000);

});

//When client detects a message
client.on("message", (message) => {
    //PMs from owner
    if (message.guild == null && message.author.id == config.owner_id){
        //console.log("RECIEVED DM FROM OWNER");
        //message.author.sendMessage("<Generic owner response>");

        client.guilds.some(guild => {
            if (guild.owner.id == message.author.id && guild.setupScript) {
                guild.setupScript.messageRecieved(message.content);
                return true;
            }
        });
        //if (message.guild.setupScript) message.guild.setupScript.messageRecieved(message.content);
    }

    //Guild messages
    if (message.guild != null){
        if (message.content.substring(0,1) == client.getGuildCommandPrefix(message.guild.id)){
            var substrings = message.content.split(" ");
            var command = substrings[0].substring(1);
            var args = substrings;
            if(commands[command] && commands[command].cliOnly) return;
            args.splice(0,1);
            console.log(`Recieved command: ${command} from author ${message.author}(${message.author.username}) with args: ${args}`);
            args.unshift(client, message);
            if(commands[command]) commands[command](args);
        }
    }
});

client.on("guildCreate", (guild) => {
    guildPrefs[guild.id] = {command_prefix: "", default_channel: ""};
    fs.writeFileSync("./guildPrefs.json", JSON.stringify(guildPrefs));
    guild.channels.some((channel) => {
        if (channel.type == "text" && channel.permissionsFor(guild.me).has("SEND_MESSAGES")){
            channel.send(`Hi, my name's Ciel, a music and utility bot for Discord! Type ${client.getGuildCommandPrefix(guild.id)}help for my commands, or ${client.getGuildCommandPrefix(guild.id)}info to learn about my creator.`);
            return true;
        }
    });
    guild.owner.send(`Hi, I'm Ciel! Thanks for inviting me to your guild: ${guild.name}! By the way, if you type ${client.getGuildCommandPrefix(guild.id)}config in any of your guild's text channels while I'm online, I'll DM you back with a little setup script, to help you personalize how I operate in your server!`);
});

//When a command is passed via CLI
readline.on("line", (line) => {
    var substrings = line.split(" ");
    var command = substrings[0];
    var args = substrings;
    args.splice(0,1);
    args.unshift(client, null);

    if (command == "?"){
        var helpString = "";
        var sortedKeys = Object.keys(commands);
        sortedKeys.sort();
        sortedKeys.forEach(key => {
            if (commands[key].cli){
                helpString += commands[key].syntax + " - " + commands[key].description + "\n"; 
            }
        });
        console.log(helpString);
    }
    else if (commands[command] && commands[command].cli) commands[command](args);
    else console.log(`Unknown console command: ${command}`);
});

// -- INIT -- 

//Load keys from file, generate keys file if non-existant
try {
    if (fs.existsSync("./keys.json")){ loadKeys(); }
    else throw error;
} catch (err) {
    console.log("\"keys.json\" file missing! Regenerating. ");
    fs.writeFileSync("./keys.json", `{\n    "bot_token" : "",\n    "google_api_key" : ""\n}`);
}

//Check for bot token, provide prompt if missing, shutdown bot.
if (!config.bot_token || config.bot_token == ""){
    console.log("ERROR: Bot token missing. Please add your bot token to keys.json. For more information, check out the CielBot documentation.\nREMINDER: Keep your bot token secret at all times! Never give it to anyone, or they will have access to your bot!");
    client.destroy();
    process.exit();
}

//Connect to Discord servers
console.log(`Initiating bot..\nDefault Command Prefix: ${config.default_command_prefix}`);
client.login(config.bot_token);


function loadKeys(){
    extend(false, global.config, JSON.parse(fs.readFileSync("./keys.json")));
}

client.getGuildCommandPrefix = function(guildID){
    return guildPrefs[guildID].command_prefix != "" ? guildPrefs[guildID].command_prefix : config.default_command_prefix;
}

client.getGuildDefaultChannel = function(guildID){
    return guildPrefs[guildID].default_channel != "" ? guildPrefs[guildID].default_channel : null;
}

