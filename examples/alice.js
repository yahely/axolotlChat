var axolotl = require("../lib/axolotl/proto.js").proto
var bn = require("../node_modules/elliptic/node_modules/bn.js/lib/bn.js");
var ecc   = require("elliptic")
var djb = new ecc.ec("curve25519");

var myAxol;
var myAxolIntro;
var otherAxolIntro;
var wroteInput = false;
var conversationStarted = false;
var handshakeMade = false;
var INPUT_DIV_CLASS_NAME = "tL8wMe xAWnQc";
var WRITING_DIV_CLASS_NAME = "vE dQ editable";
var CURR_CONVERSATION_NAME = "Ob2Lud RE EIhiV OxDpJ";
var inputElements = document.getElementsByClassName(INPUT_DIV_CLASS_NAME);
var index = inputElements.length == 0 ? 0 : inputElements.length - 1;

function uint8Array2str(buf) 
{
	return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function stringStartsWith(string, prefix) 
{
    return string.slice(0, prefix.length) == prefix;
}

function str2Uint8Array(str)
{
	var arr=[];
	for(var i=0,j=str.length;i<j;++i)
	{
		arr[i]=str.charCodeAt(i);
	}
	return new Uint8Array(arr);
}

function buildKeysSentFromPartner(axol, mode, entireMessage)
{
	  return {
		identity: {
		  PK: axol.createKeyFromJson(mode, "DHI", entireMessage["DHI"])
		},

		handshake: {
		  PK: axol.createKeyFromJson(mode, "DHHS", entireMessage["DHHS"])
		},

		ratchet: {
		  PK: axol.createKeyFromJson(mode, "DHR", entireMessage["DHR"]), 
		}
	  }
}

window.addEventListener("keydown", function(evt)
{
	var keyCode = evt ? (evt.which ? evt.which : evt.keyCode) : event.keyCode;
	//Enter
    if (keyCode == 13)
    {
		wroteInput = false;
		if(conversationStarted && myAxol && otherAxolIntro && handshakeMade)
		{
			var writingDivElements = document.getElementsByClassName(WRITING_DIV_CLASS_NAME);
			if(writingDivElements && writingDivElements.length > 0)
			{
				//When someone says "END", his side of the conversation stops being in axolotl
				if(stringStartsWith(writingDivElements[writingDivElements.length-1].innerHTML, "END"))
				{
					console.log("ENDING AXOLOTL CONVERSATION");
					conversationStarted = false;
					myAxol = null;
					otherAxolIntro = null;
				}
				//Probably we wrote a message - let's encrypt it !!!
				else if(!stringStartsWith(writingDivElements[writingDivElements.length-1].innerHTML, "BOB"))
				{
					var messageHeader = myAxol.mode + "-MESSAGE: ";
					var plainMessage = writingDivElements[writingDivElements.length-1].innerHTML;
					var otherMode = myAxol.mode == "alice" ? "bob" : "alice";
					var eyo = myAxol.encrypt(plainMessage);
					writingDivElements[writingDivElements.length-1].innerHTML = messageHeader + btoa(uint8Array2str(eyo));
					console.log(myAxol.mode + ": " + plainMessage);
				}
			}
		}
	}
});

window.addEventListener("mouseover", function()
{
	var inputDivElements = document.getElementsByClassName(INPUT_DIV_CLASS_NAME);
	var writingDivElements = document.getElementsByClassName(WRITING_DIV_CLASS_NAME);
	if(!conversationStarted)
	{
		//No one has said "START" yet, that the words to start the axolotl conversation
		if(wroteInput || !(inputDivElements && inputDivElements.length > 0 && inputDivElements[inputDivElements.length-1].innerHTML == "START"))
		{
			return;
		}
	}
	//starting conversation - who am I talking to
	if(!conversationStarted)
	{
		var currentConversation = document.getElementsByClassName(CURR_CONVERSATION_NAME);
		if(currentConversation && currentConversation.length > 0)
		{
			var name = currentConversation[0].innerHTML;
			console.log("START AXOLOTL CONVERSATION: talking to " + name);
			conversationStarted = true;
			inputDivElements = document.getElementsByClassName(INPUT_DIV_CLASS_NAME);
			index = inputDivElements.length;
			localStorage.clear();
		}
	}
	else
	{
		// I'm not alice or bob yet
		if(!myAxol) 
		{
			// has someone started to message me ? then I'm Bob
			if(index > 0 && inputDivElements.length > index) 
			{
				//Messages starting with BOB is our message (we're in BOB mode here)
				if(stringStartsWith(inputDivElements[inputDivElements.length-1].innerHTML, "BOB"))
				{
					return;
				}
				console.log("Initializing as Bob");
				myAxol = new axolotl("bob");

				index = inputDivElements.length;
				var json = JSON.parse(atob(inputDivElements[inputDivElements.length-1].innerHTML.substring(7)));

				console.log("Building alice Intro data from message received");
				otherAxolIntro = buildKeysSentFromPartner(myAxol, "alice", json);
				console.log("OK, we built alice Intro data");

				myAxolIntro = myAxol.introduce();
			
				myAxol.init(otherAxolIntro, false);
				handshakeMade = true;	
				myAxol.storePointAsJson(myAxol.mode, "DHI",  myAxolIntro.identity);
				myAxol.storePointAsJson(myAxol.mode, "DHHS", myAxolIntro.handshake);
				myAxol.storePointAsJson(myAxol.mode, "DHR",  myAxolIntro.ratchet);

				var message = [];
				message = {"DHI" : window.localStorage[myAxol.mode+"_DHI_PUBLIC_KEY"] };
				message["DHHS"] = window.localStorage[myAxol.mode+"_DHHS_PUBLIC_KEY"];
				message["DHR"] = window.localStorage[myAxol.mode+"_DHR_PUBLIC_KEY"];
				writingDivElements[writingDivElements.length-1].innerHTML ="BOB:   " + btoa(JSON.stringify(message));
				wroteInput = true;
			}

			//No one has message me yet, then I'll be Alice
			else if(writingDivElements.length > 0 && !(writingDivElements.length == 1 && writingDivElements[0].innerHTML == ""))
			{
				console.log("Initializing as Alice");
				myAxol = new axolotl("alice");
				myAxolIntro = myAxol.introduce();

				myAxol.storePointAsJson(myAxol.mode, "DHI",  myAxolIntro.identity);
				myAxol.storePointAsJson(myAxol.mode, "DHHS", myAxolIntro.handshake);
				myAxol.storePointAsJson(myAxol.mode, "DHR",  myAxolIntro.ratchet);

				var message = [];
				message = {"DHI" : window.localStorage[myAxol.mode+"_DHI_PUBLIC_KEY"] };
				message["DHHS"] = window.localStorage[myAxol.mode+"_DHHS_PUBLIC_KEY"];
				message["DHR"] = window.localStorage[myAxol.mode+"_DHR_PUBLIC_KEY"];
				writingDivElements[writingDivElements.length-1].innerHTML ="ALICE: "+ btoa(JSON.stringify(message));
				wroteInput = true;
			}
		}

		//This happens when alice sent bob her Intro and bob sent also but alice didn't save it yet
		else if(myAxol && !otherAxolIntro)
		{
			if(index > 0 && inputDivElements.length > index) 
			{
				//Messages starting with ALICE is our message (we're in ALICE mode here)
				if(stringStartsWith(inputDivElements[inputDivElements.length-1].innerHTML, "ALICE"))
				{
					return;
				}
				console.log("Received bob's Intro data");

				index = inputDivElements.length;
				var json = JSON.parse(atob(inputDivElements[inputDivElements.length-1].innerHTML.substring(7)));

				console.log("Building bob Intro data from message received");
				otherAxolIntro = buildKeysSentFromPartner(myAxol, "bob", json);
				console.log("OK, we built bob Intro data");
				myAxol.init(otherAxolIntro, false);
				handshakeMade = true;
			}
		}

		//everything has been initialized and we can message each other
		else if(handshakeMade)
		{
			//new message has been received
			if(index > 0 && inputDivElements.length > index) 
			{
				var otherMode = myAxol.mode == "alice" ? "bob" : "alice";
				//Message is in the format:  "alice-MESSAGE: ENCRYPTED_DATA"
				if(!stringStartsWith(inputDivElements[inputDivElements.length-1].innerHTML, otherMode+"-MESSAGE: "))
				{
					return;
				}
				index = inputElements.length;
				var eyo = str2Uint8Array(atob(inputElements[inputElements.length-1].innerHTML.substring(otherMode.length+"-MESSAGE: ".length)));
				var dyo = myAxol.decrypt(eyo);
				console.log(otherMode + ": " + dyo);
			}
		}
	}
});
