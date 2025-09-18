const { assert } = require('chai');
const Transaction = require('../Transaction').Transaction;
const SHA256 = require('ethereum-cryptography/sha256').sha256;
const utf8ToBytes = require('ethereum-cryptography/utils').utf8ToBytes;


describe('Transation', function () {
    const from = "1DBS97W3jWw6FnAqdduK1NW6kFo3Aid1N6";
    const to = "7W3jWw6FnAqdduK1NW6kFo3Aid1N61DBS9";
    const value = 10;
    const tx = new Transaction(from, to, value);

    describe('constructor', () => {
        it('should set the owner', () => {
            assert.equal(tx.from, from);
        });
        it('should set the amount', () => {
            assert.equal(tx.value, value);
        });
        it('should set the address', () => {
            assert.equal(tx.to, to);
        });
        it('should set spent to false', () => {
            assert.equal(tx.spent, false);
        });
    });

    describe('spend', () => {
        it('should set spent to true', () => {
            tx.spend();
            assert.equal(tx.spent, true);
        });
        it('should not spent twice', () => {
            assert.throws(() => tx.spend(), 'Already spended!');
        });
    });

    describe('hash', () => {
        it('should have valid hash', () => {
            const validHash = SHA256(utf8ToBytes(tx.from+tx.to+tx.value));
            assert.deepEqual(tx.hash, validHash);
        })
    })
});
