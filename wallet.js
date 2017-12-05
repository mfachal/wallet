
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const r2 = require('r2');
var key_pair;
var address;
var utxos;

//create a key pair and address
//pw : string : is the passphrase for generating the keys
function make_addr(pw) {
    let hash = btcjs.crypto.sha256(pw);
    let pvtkey = bigi.fromBuffer(hash);
    key_pair = new btcjs.ECPair(d);
    address = key_pair.getAddress();
}


//import key pair and address
//wif : string : is the WIF wallet
function import_addr(wif){
    key_pair = btcjs.ECPair.fromWIF(wif);
    address = key_pair.getAddress();
}

//takes array of outputs according to blockchain.info format
//returns array of {decoded_hash, vout, sequence, scriptsig}
function decode_unspents(outs){
    for (let i = 0; i < outs.length; i++){
	

    }

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

//1-to-1 transaction
//from : string : 
//to : string :
//amount : int : amount in satoshis to send
//fee : int : miner fee
function transfer(from, to, amount, fee){
    let tx = new btcjs.TransactionBuilder(/*network*/);

    let change = btcjs.ECPair.makeRandom(/**/);
    
    let utxos = get_utxos(from); //function to get UTXOs (TODO)
    //utxos is an array of UTXOs

    if (utxos.length == 0) throw "no utxos for transaction"
    
    let [utxos_used, sum] = utxos_suming(utxos, amount + fee);

//  if (utxos_used.length == 0) throw "no utxos for transaction";
    
    for (let x in utxos_used){
	tx.addInput(x.txId, x.vout);
    }

    tx.addOutput(change.getAddress(), sum - amount - fee);
    tx.addOutput(to.address(), amount);
    
    for (let i = 0; i < utxos.length; i++){
	tx.sign(i, utxos_used[i]);
    }

    send(tx);
}

function save_to_file(){

}
