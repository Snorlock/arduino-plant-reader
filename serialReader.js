var serialPort = require("serialport");
var serialPortCon = serialPort.SerialPort;
var Firebase = require('firebase');
var mongoClient = require('mongo-abstraction');
var dataRef = new Firebase('https://plantdata.firebaseio.com/');
var lastMariaValue = 0;
var lastBobValue = 0;
var reader = this;
var mongoUrl = "mongodb://snorre:snorre@ds027491.mongolab.com:27491/heroku_app32610102"
mongoClient.connect(mongoUrl, function(connected) {
	if(connected){
		reader.startInterval();
		reader.open(reader.createConnection());
	}
})

exports.createConnection = function () {
	console.log("creating connection");
	var connection = new serialPortCon('/dev/ttyAMA0', {
		baudrate: 9600,
		parser: serialPort.parsers.readline('\n')
	});	
	return connection;
}

exports.open = function (connection) {
	connection.open(function(error) {
		if(error) {
			console.log("failed to open: "+error);
		} else {
			console.log("open");
			connection.on("data", function(data) {
				console.log(data);
				var now = new Date();
				var value = {};
				if(isDataJson(data)) {
					var value = JSON.parse(data);	
				}
				
				value.created = now;
				if(value.watervalue) {
					value.plant = "bob"
					value.watervalue = 1000-value.watervalue;
					dataRef.child(value.plant).set(value, function(error){
						if(error){
							console.log(error);	
						}
						
					});
					lastBobValue = value.watervalue;
				}
				else if (value.watervalue2) {
					value.plant = "maria"
					value.watervalue = 1000-value.watervalue2;
					delete value.watervalue2;
					dataRef.child(value.plant).set(value, function(error){
						if(error) {
							console.log(error);	
						}
					});
					lastMariaValue = value.watervalue;
				}
				value = null;
			});

			dataRef.child('switch').on('value', function(data) {
				console.log(data.val());
				if(data.val() === "on") {
					connection.write("on", function(err, res){
						console.log("WRITE ON");
						console.log(err);
						console.log(res);
					})					
				}
				else if(data.val() === "off") {
					connection.write("off", function(err, res){
						console.log("WRITE OFF");
						console.log(err);
						console.log(res);
					})	
				}
			})


		}
	});
}

exports.startInterval = function() {
	setInterval(persistValue, 600000);
}

function isDataJson(data) {
	try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function persistValue() {
	console.log("persisting");
	console.log(lastMariaValue);
	if(lastMariaValue != 0 && lastBobValue != 0) {
		mongoClient.putValue("maria", lastMariaValue);
		mongoClient.putValue("bob", lastBobValue);	
	}
	
}
