/**
 * Seminar 2.4 Simple Merkle Tree
 */


function concatHashes(a, b) {
    return `Hash(${a} + ${b})`;
} 


class MerkleTree {
    constructor(leaves) {
        this.leaves = leaves;
    }

    /** Recurcive, layer by layer concatenate leaves.
     * returns: Merkle root
     */
    getConcatLeaves(leaves){
        if (leaves.length == 1) {
            return leaves[0];
        }
        else {
            const concatLeaves = [];
            for (let i = 0; i < leaves.length; i+=2) {
                const l1 = leaves[i];
                const l2 = leaves[i+1];
                if (l2){
                    concatLeaves.push(concatHashes(l1, l2));
                } else {
                    concatLeaves.push(l1);
                }
            }
            return this.getConcatLeaves(concatLeaves);
        }
    }

    /** Merkle proof  
     * returns: chain of complimentary hashes, e.g. for index=0 [B, CD, EFGH]
    */
    getProof(index, layer = this.leaves, proof = []) {
        if (layer.length === 1) return proof;
        const newLayer = [];
        for (let i = 0; i < layer.length; i += 2) {
            let left = layer[i];
            let right = layer[i + 1];
            if (!right) {
                // end of layer
                newLayer.push(left);
            }
            else {
                newLayer.push(concatHashes(left, right));
                // check index
                if (i === index || (i+1) === index) {
                    let leftLeaf = !(index % 2);
                    proof.push({
                        hash: leftLeaf ? right : left,
                        left: !leftLeaf
                    });
                }
            }
        }

        return this.getProof(Math.floor(index / 2), newLayer, proof);
    }
}


function verifyProof(proof, nodeHash, rootHash) {
    // TODO Verify proof chain
    let hash = nodeHash;
    for(let i=0; i<proof.length; i++){
        const complNode = proof[i];
        if (!complNode.left){
            hash = concatHashes(hash, complNode.hash);
        } else {
            hash = concatHashes(complNode.hash, hash);
        }
    }
    return hash == rootHash;
}


module.exports = {MerkleTree, verifyProof}
