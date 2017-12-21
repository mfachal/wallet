
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const readline = require('readline');
var login = false;
var key_pair;
var address;
var network = btcjs.networks.testnet;

async function login(){
    //when it gets asked for login this program asks for login from the user
    let pw = await ask_user();
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

    
}

function sign(tx){
    if (!logged){
	login();
    }
    
    for (let i = 0; i < tx.ins.length; i++){
	tx.sign(i, key_pair);
    }

    
}

function receive(){
    //listener



    
}
