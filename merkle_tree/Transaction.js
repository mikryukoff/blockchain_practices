/**
 * Seminar 2.2 Transaction output
 */

const SHA256 = require('ethereum-cryptography/sha256').sha256;
const utf8ToBytes = require('ethereum-cryptography/utils').utf8ToBytes;


class Transaction {
    constructor(from, to, value) {
        // TODO 1 Init transaction from, to, value, spent, hash 
        this.from = from;
        this.to = to;
        this.value = value;
        this.spent = false;
        this.hash = null;
    }
    spend() {
        // TODO 2 Check is transaction spent
        if(this.spent == true){
            throw new Error('Already spended!');
        }
        this.spent = true;
        this.hash = SHA256(utf8ToBytes(this.from + this.to + this.value));
    }
}

module.exports = { Transaction }
