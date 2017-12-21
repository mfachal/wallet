
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const readline = require('readline');
const ipc = require('node-ipc');

var login = false;
var key_pair;
var address;
var network = btcjs.networks.testnet;

async function login(pass){
    //when it gets asked for login this program asks for login from the user
    if (!pass){
	let pw = await ask_user();
	if (!pw) {
	    throw "no pw";
	}
    }
    let hash = btcjs.crypto.sha256(pw);
    let pvtkey = bigi.fromBuffer(hash);
    key_pair = new btcjs.ECPair(pvtkey, null,{network: btcjs.networks.testnet});
    address = key_pair.getAddress();
    return address;
}

async function ask_user(){
    const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
    }); //later change this to some ux/ui/etc

    var pw = "";
    
    rl.question('please input password: ', (answer) => {
	// TODO: Log the answer in a database
	pw = answer;
	rl.close();
	return pw;
    });

    return;
}

function sign(tx){
    if (!logged){
	login();
    }
    
    for (let i = 0; i < tx.ins.length; i++){
	tx.sign(i, key_pair);
    }

    
}

ipc.config.id = 'btcjs-serv';
ipc.config.retry = 1500;
ipc.config.silent = true;
ipc.serve(
    function(){
	ipc.server.on('login', function(data){
	    login(data);
	});
	ipc.server.on('sign', function(data){
	    sign(JSON.parse(data));
	});
	ipc.server.on('socket.disconnected', function{
	    key_pair = undefined;
	    logged = false;
	});
    }
);
ipc.server.start();
