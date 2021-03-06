//requirements
var express = require("express")
, app		= express()
, http		= require("http").Server(app)
, io 		= require('socket.io')(http)
, path		= require("path")
, port		= process.env['PORT'] || 3007;

app.use(express.static(path.join(__dirname, 'public')));
var scripterResponse = [
	"Don't be that guy...",
	"Come on man...",
	"Not nice...",
	"Cut it out..."
];
var webPages = "/views/";
//route functions
function index(req, res){
	res.setHeader("Content-Type", "text/html");
	res.sendFile(__dirname + webPages + "index.html");
}
function chatPage(req, res){
	res.setHeader("Content-Type", "text/html");
	res.sendFile(__dirname + webPages + "chat.html");
}
//routes
app.get("/", index);
app.get("/chat", chatPage);
//socket
// connection and chat receiving.
var users = {};
var rawUserList = "";
var userCount = 0;
var history = [];
var historyLimit = 25;

//chat server connection
io.on("connection", function(socket){
	//socket.on("error", function(err){
		//console.log(err);
	//});
	socket.on("validate", function(name){
		console.log("running validation...");
		for(var key in users){
			if(users[key] === name){
				io.to(socket.id).emit("used");
				//console.log(name);
				//console.log("taken");
				name = "";
				return false;
			}
		}
		io.to(socket.id).emit("open");
		//console.log(name);
		//console.log("open");
	});
	socket.on("join", function(name){
		console.log("name: " + name);
		console.log("type of name: " + typeof name);
		if(typeof name === "function" ||
			typeof name === "object" ){
			io.to(socket.id).emit("illegal", "Illegal operation.")
			return false;
		} else
		if(name.length <3 ||
			name.length >14 ||
			name.match(/[\`\~\|\<\>\s,\?\*\&\^%\$#@!\(\)\\\/\{\}=+\;\:\"\']/ig) ||
			name.match(/[\-\_\.]/ig) &&
			name.match(/[\-\_\.]/ig).length > 1 ){
			name = name.replace(/[<]/ig, "&lt;");
			name = name.replace(/[>]/ig, "&gt;");
			io.to(socket.id).emit("illegal", "Illegal operation.")
			return false;
		} else
		{
			users[socket.id] = name;
			io.emit("update", users[socket.id] + " has connected to the server!");
			for(var log in history){
				io.to(socket.id).emit("chat message", "" + history[log].userName, history[log].message);
			}
			rawUserList = "";
			for(var key in users){
				rawUserList += users[key] + " ";
			}
			io.emit("user list", rawUserList);
			userCount = Object.keys(users).length;
			console.log(name + " connected");
			console.log("Users: " + userCount);
		}
	});//end on join
	//on chat msg
	socket.on("chat message", function(msg){
		//validate user
		if(!users[socket.id] ){
			return false;
		} else
		{//check script tags
			console.log(typeof msg === "function");
			if(typeof msg === "function" ||
				typeof msg === "object" ){
				//console.log("Snagged scripter.");
				io.to(socket.id).emit("illegal", "Illegal Operation.");
				/*
				io.to(socket.id).emit("command", scripterResponse[Math.floor(Math.random(scripterResponse.length)*scripterResponse.length) ]);
				console.log(Math.floor(Math.random(scripterResponse.length)*scripterResponse.length) );
				*/
				return false;
			}
			msg = msg.replace(/[<]/ig, "&lt;");
			msg = msg.replace(/[>]/ig, "&gt;");
			//check if list command
			if(msg.match(/^([\/]list)/i)){
				var cmdUserList = "";
				index = 1;
				for(var vals in users){
					if(index === userCount){
						cmdUserList += users[vals] + ".";}
						else{
						cmdUserList += users[vals] + ", ";}
					index++;
				}
				io.to(socket.id).emit("command", "Users: " + cmdUserList);
			} else //check if users commands
			if(msg.match(/^([\/]users)/i)){
				var cmdMsg = "";
				if(userCount > 1){
					cmdMsg = "There are " + userCount + " concurrent users.";
				}
					else{
					cmdMsg = "There is " + userCount + " concurrent user.";
				}
				io.to(socket.id).emit("command", cmdMsg);
			} else //default chat message
			{
				io.emit("chat message", "" + users[socket.id], msg);
				history.push(
						{
							"userName": users[socket.id],
							"message": msg
						}
					);
				if(history.length > historyLimit){
					history.shift();
				}
				//console.log(history);
			}
		}
		//socket.broadcast.emit("chat message", msg);
		console.log(users[socket.id] + " - " + msg);
	});//end chat message
	//on user disconncet
	socket.on("disconnect", function(){
		io.emit("update", users[socket.id] + " has disconnected from the server.");
		console.log(users[socket.id] + " Disconnected.");
		delete users[socket.id];
		userCount = Object.keys(users).length;
	});
});
//emit chat messages
io.emit("some event", {for: "everyone"});

http.listen(port);

console.log("server running at localhost:" + port + "");