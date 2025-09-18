/**
 * Seminar 2.1 Blockchain primitive
 */

const SHA256 = require('ethereum-cryptography/sha256').sha256;
const utf8ToBytes = require('ethereum-cryptography/utils').utf8ToBytes;


class Block {
    constructor(data){
        this.data = data;      // Here we simplify data, let it be just a simple string
        this.previousHash = null;
    }

    toHash(){
        const hashBytes = utf8ToBytes(this.data + this.previousHash);
        return SHA256(hashBytes);        // a hash as byte array
    }
}


class Blockchain {
    constructor() {
        
        this.chain = [
             /* TODO 1: Create the genesis block here */ 
            new Block("Hello, blockchain!")
            ];
    }

    addBlock(block){
        // TODO 2 Compute block.previousHash = previousBlock.toHash()
        block.previousHash = this.chain[this.chain.length-1].toHash()
        this.chain.push(block)
    }

    isValid(){
        // TODO 3 Check every block previous hash
        for(let i=this.chain.length-1; i>0; i--){
            const block = this.chain[i];
            const previous_block = this.chain[i-1];
            if(block.previousHash.toString() !== previous_block.toHash().toString()){
                return false;
            }
        }
        return true;
    }
}

module.exports = { Block, Blockchain };
