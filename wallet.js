
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const dhttp = require('dhttp/200');
var key_pair;
var address;

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

function get_utxos(){
    //TODO
    //something to blockchain.info etc?
    //OR: it could get the whole history of transactions and derive utxos from there
    // Single Address

    // https://blockchain.info/es/rawaddr/$bitcoin_address
    // Address can be base58 or hash160

    //returns json with array of transactions

    /////////////////////////OR:

    // Unspent outputs

    // https://blockchain.info/es/unspent?active=$address

    //NOTE: tx_hash is byte_reversed
    
    let _url = 'https://blockchain.info/es/unspent?active=' + address;
    
    dhttp({
	method: 'GET',
	url: _url,
	json: true
    }, function (err, res){
	if (err) throw "unable to connect to blockchain.info";

	return res["unspent_outputs"];
    })
    
    return [];
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
function transfer(from, to, amount){
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
