
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const readline = require('readline');
const ipc = require('node-ipc');
const rlsync = require('readline-sync');
var logged = false;
var key_pair;
var address;
var network = btcjs.networks.testnet;

async function login(pass){
    //when it gets asked for login this program asks for login from the user
    let pw = "";
    if (!logged && (!pass || !pass.pw)){
	pw = await ask_user();
	if (!pw) {
	    throw "no pw";
	}
    } else {
	pw = pass.pw;
    }
    let hash = btcjs.crypto.sha256(pw);
    let pvtkey = bigi.fromBuffer(hash);
    key_pair = new btcjs.ECPair(pvtkey, null,{network: btcjs.networks.testnet});
    address = key_pair.getAddress();
    console.log('logged in');
    return address;
}

async function ask_user(){
    let pw = rlsync.question('input confirmation: ');
    return pw
}

async function sign(tx){
    if (!logged){
	await login(undefined);		// 
    }
    try {
	let txb = new btcjs.TransactionBuilder(network);
	txb.inputs = tx.inputs;
	txb.tx = tx.tx;

	for (let i = 0; i < tx.inputs.length; i++){
	    txb.sign(i, key_pair);
	}

	return txb;
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
	    login(data);
	});
	ipc.server.on('sign', async function(data, socket){
//	    console.log('sign: ', data);
	    let tx = await sign(data);
	    console.log(tx);
	    ipc.server.emit(
		//signed transaction
		socket,
		"signed", tx
	    );
	});
	ipc.server.on('socket.disconnected', function(){
	    key_pair = undefined;
	    logged = false;
	});
    }
);
ipc.server.start();
