
const btcjs = require('bitcoinjs-lib');
const bigi = require('bigi');
const r2 = require('r2');
const stdin = process.openStdin();

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
    for (let i = 0; i < outs.length; i++){
	let j = {hash: reverse_byte_order(outs[i].tx_hash),
		 vout: outs[i].tx_output_n,                 //???
		 sequence: 0,                               //???
		 script: outs[i].script,
		 value: outs[i].value
		};
#if DEBUG
	console.log("j: ", j);
#endif
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
    console.log("request_answer: ", request_answer);
    console.log("type: ", typeof request_answer);
#endif
    
    try {
	return decode_unspents(JSON.parse(request_answer).unspent_outputs);
    } catch (e) {
#if DEBUG
	return [];
#endif
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
#if DEBUG
   // _utxos.push({tx_hash: "aaaa", vout: 1});
    console.log("_utxos: ", _utxos);
    console.log("_utxos.length: ", _utxos.length);
    console.log("typeof _utxos: ", typeof _utxos);
#endif
    if (_utxos === []) throw "aaa";
    _utxos.sort(sort_tx);
#if DEBUG
    console.log("a3");
    console.log("_utxos: ", _utxos);
#endif
    let x = 0;
    let res = [];
    let i = 0;

    while (i < _utxos.length && x < amount){
	res.push(_utxos[i]);
	x = x + parseInt(_utxos[i].value);
	i++;
    }
    
    if (x < amount) throw "insufficient money in utxos";

    console.log("s: ", x);
    
    return [res, x];
}

async function send(tx){
    //TODO
    //await r2.post(/*network*/, txb.build().toHex());

    await r2.post("https://blockchain.info/pushtx", txb.build().toHex());
    
    return;
}

//1-to-1 transaction
//from : string : 
//to : string :
//amount : int : amount in satoshis to send
//fee : int : miner fee
async function transfer(from, to, amount, fee){
    let tx = new btcjs.TransactionBuilder(// btcjs.networks.testnet
    );

    
    
    let change = btcjs.ECPair.makeRandom(// btcjs.networks.testnet
    );
    
    let utxos = await get_utxos(from); //function to get UTXOs (TODO)
    //maybe it's better to store them in a cache somewhere instead of going all the time to the server
    //utxos is an array of UTXOs

    if (utxos.length == 0) throw "no utxos for transaction";
    let [utxos_used, sum] = utxos_suming(await utxos, amount + fee);

#if DEBUG
    console.log("s: ", sum);
    console.log("a3.5");
#endif
    
    for (let x of utxos_used){
#if DEBUG
	console.log("utxos_used: ", utxos_used);
	console.log("X: ", x);
#endif
	tx.addInput(x.hash, x.vout , null, Buffer.from(x.script)
		   ); //vout is actually the index of the output
	
#if DEBUG
    console.log("a3.99");
#endif
    }

#if DEBUG
    console.log("a4");
    console.log("to: ", to);
    console.log("change_addr: ", change.getAddress());
    console.log("change.script: ", change.script);
    
    tx.addOutput('1JtK9CQw1syfWj1WtFMWomrYdV3W2tWBF9', 18000)

    console.log("change.getAddress: ", change.getAddress);
    console.log("s: ", sum);
    console.log("a: ", amount);
    console.log("f: ", fee);
    console.log("s-a-f: ", sum-amount-fee);
#endif
    tx.addOutput(change.getAddress(), sum - amount - fee); //sum-amount-fee

    // function addOutput (e, i) { transaction.addOutput(toAddresses[i], amounts[i]); }
    // toAddresses.map(addOutput);
    
    tx.addOutput(to, amount);

#if DEBUG
    console.log("kp: ", key_pair);
#endif
    
    for (let i = 0; i < utxos.length; i++){
	tx.sign(i, key_pair);
    }

#if DEBUG
    return tx;
#else
    await send(tx);
#endif
}



//main (entry point)

// stdin.addListener("data", function (d) {
//     //something with d, deciding on input
// });

let a = make_addr("correct horse battery staple");
console.log("a: " , a);
//get_utxos_test(a);
//get_utxos_test("134ZnmvWpGDGSwU6AnkgSEqP3kZ2cKqruh");

transfer_test();

async function get_utxos_test(b){
    let f = await get_utxos(b);
    console.log("f: ", f);
}

async function test_transfer_1(a, b){
    let tx = new btcjs.TransactionBuilder(// btcjs.networks.testnet
    );

    let key_pair = btcjs.ECPair.fromWIF('L1uyy5qTuGrVXrmrsvHWHgVzW9kKdrp27wBC7Vs6nZDTF2BRUVwy');
    let from = key_pair.getAddress();
    let to = key_pair.getAddress();
    let amount = 1;
    let fee = 1;
    let change = btcjs.ECPair.makeRandom(// btcjs.networks.testnet
    );
    
    let utxos = await get_utxos(from); //function to get UTXOs (TODO)
    //maybe it's better to store them in a cache somewhere instead of going all the time to the server
    //utxos is an array of UTXOs

    if (utxos.length == 0) throw "no utxos for transaction";
    let [utxos_used, sum] = utxos_suming(await utxos, amount + fee);

#if DEBUG
    console.log("s: ", sum);
    console.log("a3.5");
#endif
    
    for (let x of utxos_used){
#if DEBUG
	console.log("utxos_used: ", utxos_used);
	console.log("X: ", x);
#endif
	tx.addInput(x.hash, x.vout , null, Buffer.from(x.script)
		   ); //vout is actually the index of the output
	
#if DEBUG
    console.log("a3.99");
#endif
    }

#if DEBUG
    console.log("a4");
    console.log("to: ", to);
    console.log("change_addr: ", change.getAddress());
    console.log("change.script: ", change.script);
    
    //    tx.addOutput('1JtK9CQw1syfWj1WtFMWomrYdV3W2tWBF9', 18000)

    console.log("change.getAddress: ", change.getAddress);
    console.log("s: ", sum);
    console.log("a: ", amount);
    console.log("f: ", fee);
    console.log("s-a-f: ", sum-amount-fee);
#endif
    tx.addOutput(change.getAddress(), sum - amount - fee); //sum-amount-fee

    // function addOutput (e, i) { transaction.addOutput(toAddresses[i], amounts[i]); }
    // toAddresses.map(addOutput);
    
    tx.addOutput(to, amount);

#if DEBUG
    console.log("kp: ", key_pair);
#endif
    
    for (let i = 0; i < utxos.length; i++){
	tx.sign(i, key_pair);
    }

#if DEBUG
    return tx;
#else
    await send(tx);
#endif
}

async function transfer_test(){
    try{
    let a = await test_transfer_1(1, 1);
    console.log("a: ", a);
    } catch (e) {}
    let t = await transfer("134ZnmvWpGDGSwU6AnkgSEqP3kZ2cKqruh", "134ZnmvWpGDGSwU6AnkgSEqP3kZ2cKqruh", 1, 1); // 
    console.log("t: ", await t);

}
