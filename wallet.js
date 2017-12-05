
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const r2 = require('r2');
var key_pair;
var address;

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
    for (let i = hash.length-1; i > 0; i -=2){
	let buf = hash[i].concat(hash[i-1]);
	reversed_hash.concat(buf);
    }
    return buf;
}

//takes array of outputs according to blockchain.info format
//returns array of {decoded_hash, vout, sequence, scriptsig}
function decode_unspents(outs){
    let res = []
    for (let i = 0; i < outs.length; i++){
	let j = {hash: reverse_byte_order(outs[i].tx_hash),
		 vout: outs[i].value,                       //???
		 sequence: 0,                               //???
		 script: outs[i].script
		};
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
    let json_unspents = await r2(_url).json;

    let unspents = decode_unspents(json_unspents.unspent_outputs); //array of {hash, vout (whatever it is), sequence, scriptsig}, ready for addInput
    return unspents;
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
    await r2.post(/*network*/, txb.build().toHex());
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
