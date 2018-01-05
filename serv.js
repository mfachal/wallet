
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const readline = require('readline');
const ipc = require('node-ipc');
const rlsync = require('readline-sync');
const bip39 = require('bip39');
const crypto = require('crypto');

var logged = false;
var key_pair;
var hd_node;
var address;
var network = btcjs.networks.testnet;

const encrypted_kp = crypto.createCipher('aes192', '');

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

    key_pair = new btcjs.ECPair(pvtkey, null, {network: network});
    address = key_pair.getAddress();

//   console.log("key_pair: ", key_pair);

    // let str_encrt = cryptojs.AES.encrypt(key_pair.toString(), pw);
    // console.log(key_pair);

    // let a = cryptojs.AES.decrypt(str_encrt, pw);
    // console.log(a);
    // let b = JSON.parse(a);
    // console.log(b.getAddress());
    
//    key_pair = cryptojs.AES.encrypt(key_pair.toString(), pw);
//   key_pair = JSON.parse(key_pair.toString(cryptojs.enc.Utf8));
   
    logged = true;
    console.log('logged in, ', address);
    return address;
}

async function ask_user(){
    let pw = rlsync.question('input password: ');
    //this should unencrypt key_pair/hd_node
    // let kp = cryptojs.AES.decrypt(key_pair.toString(), pw);
    // key_pair = JSON.parse(kp.toString(cryptojs.enc.Utf8));
    
    return pw
}

async function import_node(xpriv){
    hd_node = btcjs.HDNode.fromBase58(xpriv, network);
    return;
}

async function get_node(mnemonic){
    if (!mnemonic){
	mnemonic = bip39.generateMnemonic();
	//show mnemonic to user
	console.log("this is your mnemonic: ", mnemonic);
    }
    
    let seed = bip39.mnemonicToSeed(mnemonic /*, password*/);
    hd_node = btcjs.HDNode.fromSeedBuffer(seed);

    return get_pair();
}

async function get_pair(path){
    if (!path){
	path = "m/0'/0/0";
    }
    key_pair = hd_node.derivePath(path);
    address = key_pair.getAddress();
    login = true;
    return key_pair;
}

async function sign(tx){
    if (!logged){
	await login(undefined);
    }
    
    try {

	let conf = rlsync.question('please input your password (for confirmation):');
	// let kp = cryptojs.AES.decrypt(key_pair.toString(), pw);
	// key_pair = JSON.parse(kp.toString(cryptojs.enc.Utf8));
	
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

	// ipc.server.on('get_address', function(data){...});
	
	ipc.server.on('login', async function(data, socket){
	    await login(data);

	    //DEBUG
	    
	    const secret = 'abcdefg';
	    const hash = crypto.createHmac('sha256', secret)
                  .update('I love cupcakes')
                  .digest('hex');
	    console.log(hash);

	    
	    
	    ipc.server.emit(
		//signed transaction
		socket,
		"logged", address
	    );
	    
	});

	ipc.server.on('get_node', async function(data, socket){
	    get_node(data);
	});
	
	ipc.server.on('address', function(data, socket){
	    ipc.server.emit(socket, 'address', address);
	});
	
	ipc.server.on('sign', async function(data, socket){
	    let tx = await sign(data);
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
