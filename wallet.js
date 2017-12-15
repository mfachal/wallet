
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const r2 = require('r2');
const request = require('request');
var key_pair;
var address;
var network = btcjs.networks.testnet;
#define DEBUG 0

//create a key pair and address
//pw : string : is the passphrase for generating the keys
function make_addr(pw) {
    let hash = btcjs.crypto.sha256(pw);
    let pvtkey = bigi.fromBuffer(hash);
    key_pair = new btcjs.ECPair(pvtkey, null,{network: btcjs.networks.testnet});
    address = key_pair.getAddress();
    return address;
}


//import key pair and address
//wif : string : is the WIF wallet
function import_addr(wif){
    key_pair = btcjs.ECPair.fromWIF(wif, btcjs.networks.testnet);
    address = key_pair.getAddress();
}

//takes string representing the hash
function reverse_byte_order(hash){
    let reversed_hash = "";
    let i = hash.length - 1;
    for (let i = hash.length-1; i > 0; i -=2){
	let buf = hash[i-1].concat(hash[i]);
	reversed_hash = reversed_hash.concat(buf);
    }
    return reversed_hash;
}

async function get_utxos(of){
    let _url = 'https://testnet.blockchain.info/es/unspent?active=' + of;
    let request_answer = await r2(_url).text;
    
    try {
	return JSON.parse(request_answer).unspent_outputs;
    } catch (e) {
// 	if (request_answer === "Service Unavailable"){
// 	    _url = 'testnet.blockexplorer.com/api/addr/' + of + '/utxo';
// 	    request_answer = await r2(_url).text;
	// }
	return [];
    }
}

//-1 if tx_a.value < tx_b, 0 if equal, 1 if not
//tx_a, tx_b : transactions
function sort_tx(tx_a, tx_b){
    return (tx_a.value - tx_b.value);
}

//get UTXOs suming at least an amount
//utxos : array of transactions : unused transaction outputs for minting into a new transaction
//amount : int : desired amount of money
//should privilege smaller amounts
function utxos_suming(_utxos, amount){
    if (_utxos === []) throw "aaa";

    _utxos.sort(sort_tx);
    let x = 0;
    let res = [];
    let i = 0;

    while (i < _utxos.length && x < amount){
	    res.push(_utxos[i]);
	    x = x + parseInt(_utxos[i].value);
	i++;
    }
    
    if (x < amount) throw "insufficient money in utxos";

    return [res, x];
}

async function send(tx){

    let req = request.post({
	headers: {'content-type' : 'application/x-www-form-urlencoded'},
	url: 'https://testnet.blockchain.info/pushtx',
	body: 'tx='+tx.build().toHex()
    }, (e, r, b) => {if (!e){
#if DEBUG
	console.log(r);
#endif
	console.log(b);
    } else {
	console.log(e);}});

#if DEBUG
    console.log("r: ", req);
#endif
    return;
}

//1-to-1 transaction
//from : string : 
//to : string :
//amount : int : amount in satoshis to send
//fee : int : miner fee
async function transfer(from, to, amount, fee){
    let tx = new btcjs.TransactionBuilder(network);

    let utxos = await get_utxos(from);

    if (utxos.length == 0) throw "no utxos for transaction";
    
    let sumamount = amount.reduce((x,y) => (x+y));
    let [utxos_used, sum] = utxos_suming(utxos, sumamount + fee);
    
    for (let x of utxos_used){
	tx.addInput(Buffer(x.tx_hash, 'hex'), x.tx_output_n);
    }

    tx.addOutput(from, sum - sumamount - fee);
    
    for (let i = 0; i < to.length && i < amount.length; i++){
	console.log(to[i]);
	console.log(amount[i]);
	tx.addOutput(to[i], parseInt(amount[i]));
    }
    
    for (let i = 0; i < utxos_used.length; i++){
	tx.sign(i, key_pair);
    }
    await send(tx);
    return tx;
}

async function getBalance(addr){
    let _url = 'https://testnet.blockchain.info/es/rawaddr/' + addr;
    let request_answer = await r2(_url).text;
    try {
	let balance = JSON.parse(request_answer).final_balance;
	return balance;
    } catch (e) {
	return request_answer;
    }
}

function usage(){
    console.log("usage: transfer <PASSWORD> <TO1>[,<TO2>[,...]] <AMOUNT> <FEE1>,...");
    console.log("       balance <ADDR>");
    console.log("       address <PASSWORD>");
    return
}

async function handle_cases(args){
    switch (args[0]) {
    case "transfer":{
	if (!args[1] || !args[2] || !args[3] || !args[4]){
	    usage();
	    return;}
	let addr = make_addr(args[1]);
	await transfer(addr, args[2].split(','), args[3].split(','), args[4]);
	break;}
    case "getbalance":{
	if (!args[1]){
	    usage();
	    return;}
	let balance = await getBalance(args[1]);
	console.log(balance);
	break;}
    case "address":{
	if (!args[1]){
	    usage();
	    return;}
	let addr = make_addr(args[1]);
	console.log(addr);
	break;}
    default:{
	usage();
	break;}
    }
    return;
}

async function main() {
    if (process.argv[2] === "console") {
	// const readline = require('readline');
	// const rl = readline.createInterface({
	//     input: process.stdin,
	//     output: process.stdout
	// });
	// var exit = 0;
	
	// while (!exit){
	//     rl.on('line', (input) => {
	// 	if (input == "exit"){
	// 	    exit = 1;
	// 	}
	// 	let cmd = to_array(input);
	// 	handle_cases(cmd);
	//     });
	// }
	// rl.close();
    }
    // if (process.argv[2] === "ol") {
    try {
	await handle_cases(process.argv.slice(2));
    } catch (e) {
	console.log(e);}
    return;
    // }
    
}

main();
