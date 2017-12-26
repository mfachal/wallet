
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const readline = require('readline');
const ipc = require('node-ipc');

var logged = false;
var key_pair;
var address;
var network = btcjs.networks.testnet;

async function login(pass){
    //when it gets asked for login this program asks for login from the user
    if (!pass || !pass.pw){
	let pw = await ask_user();
	if (!pw) {
	    throw "no pw";
	}
    }
    let hash = btcjs.crypto.sha256(pass.pw);
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
	// TODO: Log the answer somewhere?
	pw = answer;
	rl.close();
	return pw;
    });

    return;
}

function sign(tx){

    console.log(tx);

    if (!logged){
	// login();		// 
    }

    try {

	let txb = new btcjs.TransactionBuilder(network);
	txb.inputs = tx.inputs;
	txb.tx = tx.tx;

	for (let i = 0; i < tx.inputs.length; i++){
	    txb.sign(i, key_pair);
	}
    } catch (e) {
	console.log(e);
    }
}

ipc.config.id = 'btcjsserv';
ipc.config.retry = 1500;
ipc.config.silent = true;
ipc.serve(
    function(){
	ipc.server.on('connect', function(data){
	    console.log("received connection, ");
	});
	ipc.server.on('debug', function(data){
	    console.log('received: ', data);
	});
	
	ipc.server.on('login', function(data){
	    console.log('login: ', data);
	    //	    login(data);
	});
	ipc.server.on('sign', function(data){
//	    console.log('sign: ', data);
	    sign(data);
	    
	});
	ipc.server.on('socket.disconnected', function(){
	    key_pair = undefined;
	    logged = false;
	});
    }
);
ipc.server.start();
