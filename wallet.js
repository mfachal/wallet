
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const r2 = require('r2');
var key_pair;
var address;

#define DEBUG 1

//create a key pair and address
//pw : string : is the passphrase for generating the keys
function make_addr(pw) {
    let hash = btcjs.crypto.sha256(pw);
    let pvtkey = bigi.fromBuffer(hash);
    key_pair = new btcjs.ECPair(pvtkey);
    address = key_pair.getAddress();
    return address;
}


//import key pair and address
//wif : string : is the WIF wallet
function import_addr(wif){
    key_pair = btcjs.ECPair.fromWIF(wif);
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

//takes array of outputs according to blockchain.info format
//returns array of {decoded_hash, vout, sequence, scriptsig}
function decode_unspents(outs){
    let res = []
#if DEBUG
    console.log("outs.length: ", outs.length);
#endif
    for (let i = 0; i <= outs.length; i++){
	let j = {hash: reverse_byte_order(outs[i].tx_hash),
		 vout: outs[i].value,                       //???
		 sequence: 0,                               //???
		 script: outs[i].script
		};
	console.log("jijiji", j);
	res.push(j);
    }
    return res;
}

async function get_utxos(of){
    //TODO
    // Unspent outputs
    // https://blockchain.info/es/unspent?active=$address
    //NOTE: tx_hash is byte reversed
    
    let _url = 'https://blockchain.info/es/unspent?active=' + of;
    let request_answer = await r2(_url).text;
#if DEBUG
    console.log("request_anser: ");
    console.log(request_answer);
    console.log("type: ");
    console.log(typeof request_answer);
#endif
    
    try {
	return decode_unspents(JSON.parse(request_answer).unspent_outputs);
    } catch (e) {
	return decode_unspents(
	    {unspent_outputs:[
		    {
			tx_age:"1322659106",
			tx_hash:"e6452a2cb71aa864aaa959e647e7a4726a22e640560f199f79b56b5502114c37",
			tx_index:"12790219",
			tx_output_n:"0",
			script:"76a914641ad5051edd97029a003fe9efb29359fcee409d88ac",
			value:"5000661330"
		    }
		]}.unspent_outputs);
    }
    // let json_unspents = await r2(_url).json;

    // let unspents = decode_unspents(json_unspents.unspent_outputs); //array of {hash, vout (whatever it is), sequence, scriptsig}, ready for addInput
    // return unspents;
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
function utxos_suming(utxos, amount){
    utxos.sort(sort_tx);
    let x = 0;
    let res = [];
    let i = 0;

    while (i < utxos.length && x < amount){
	res.push(utxos[i]);
	x = x + utxos[i].amount;
	i++;
    }
    
    if (x < amount) throw "insufficient money in utxos";
    
    return [utxos, x];
}

async function send(tx){
    //TODO
    //await r2.post(/*network*/, txb.build().toHex());
    return;
}

//1-to-1 transaction
//from : string : 
//to : string :
//amount : int : amount in satoshis to send
//fee : int : miner fee
async function transfer(from, to, amount, fee){
    let tx = new btcjs.TransactionBuilder(/*network*/);

    let change = btcjs.ECPair.makeRandom(/**/); //shouldn't there be some kind of hash/etc. here?
    
    let utxos = await get_utxos(from); //function to get UTXOs (TODO)
    //maybe it's better to store them in a cache somewhere instead of going all the time to the server
    //utxos is an array of UTXOs

    if (utxos.length == 0) throw "no utxos for transaction"
    
    let [utxos_used, sum] = utxos_suming(utxos, amount + fee);
    
    for (let x in utxos_used){
	tx.addInput(x.hash, x.vout);
    }

    tx.addOutput(change.getAddress(), sum - amount - fee);
    tx.addOutput(to.address(), amount);
    
    for (let i = 0; i < utxos.length; i++){
	tx.sign(i, utxos_used[i]);
    }

    await send(tx);
}

//main (entry point)
let a = make_addr("a13213123");
console.log("a: " + a);
hola(a);


async function hola(b){
    let f = await get_utxos(b);
    console.log("f: ");
    console.log(f);
}
