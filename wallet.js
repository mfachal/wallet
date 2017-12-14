
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const r2 = require('r2');
const dhttp = require('dhttp');

var key_pair;
var address;

#define DEBUG 1

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
    //TODO
    // Unspent outputs
    // https://blockchain.info/es/unspent?active=$address
    //NOTE: tx_hash is byte reversed
    
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
	if (parseInt(_utxos[i].value) !== 0){
	    res.push(_utxos[i]);
	    x = x + parseInt(_utxos[i].value);}
	i++;
    }
    
    if (x < amount) throw "insufficient money in utxos";

    return [res, x];
}

async function send(tx){
//    let as = await r2.post("https://blockchain.info/pushtx", tx.build().toHex()); //???
    let r = await dhttp({
        method: 'POST',
        url: 'https://testnet.blockchain.info/pushtx',
        body: 'tx='+tx.build().toHex()
    });
#if DEBUG
    console.log("hex: ", tx.build().toHex());
    console.log("r: ", r);
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
    let [utxos_used, sum] = utxos_suming(utxos, amount + fee);
    
    for (let x of utxos_used){
#if DEBUG
	console.log(x);
#endif
	tx.addInput(Buffer(reverse_byte_order(x.tx_hash), 'hex'), x.tx_output_n);
    }

    tx.addOutput(from, sum - amount - fee);
    tx.addOutput(to, amount);
    
    for (let i = 0; i < utxos_used.length; i++){
	tx.sign(i, key_pair);
    }
    console.log(tx.tx.outs);
    
#if DEBUG
    await send(tx);
#endif
    return tx;
}

async function getBalance(addr){
    let _url = 'https://testnet.blockchain.info/es/rawaddr/' + addr;
    let request_answer = await r2(_url).text;
    let balance = JSON.parse(request_answer).final_balance;
    return balance;    
}


//main (entry point)

// stdin.addListener("data", function (d) {
//     //something with d, deciding on input
// });

let a = make_addr("mochilamochila");
var network = btcjs.networks.testnet;
console.log("a: " , a);
//get_utxos_test(a);
//get_utxos_test("134ZnmvWpGDGSwU6AnkgSEqP3kZ2cKqruh");
// console.log(getBalance(a));
transfer_test(a);
//fdfd(a);

async function fdfd(a){
    let b = await getBalance(a);
    console.log(b);
    // let j = await transfer(a, "2N1BaF6bZwetgUAgbuiTj5GmFmGmnDjbC3A", 64998000, 1000)
    // console.log(j.build().toHex());
}

async function get_utxos_test(b){
    let f = await get_utxos(b);
    console.log("f: ", f);
}

async function transfer_test(ad){
    console.log(ad);
    let t = await transfer(ad, ad, 1, 1000);
//    console.log("t: ", await t);
//    console.log("ins: ", t.tx.ins);
//    console.log("outs: ", t.tx.outs);
//    console.log("hex: ", t.build().toHex());
}
