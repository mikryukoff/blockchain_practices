/**
 * Seminar 2.3 Binary search tree
 */

class Node {
    constructor(data) {
        this.data = data;
        this.left = null;
        this.right = null;
    }
}


class Tree {
    constructor() {
        this.root = null;
    }

    addNext(child, parent){
        if (child.data < parent.data){
            if (parent.left){
                this.addNext(child, parent.left)
                return;
            } else {
                parent.left = child;
                return;
            }
        } else {
            if (parent.right){
                this.addNext(child, parent.right);
                return;
            } else {
                parent.right = child;
                return;
            }
        }
    }

    addNode(node){
        // TODO 1 Implement 
        if (this.root) this.addNext(node, this.root); 
        else this.root = node;
    }

    hasNext(child_data, parent){
        if (child_data == parent.data) return true;
        else {
            if (child_data < parent.data){
                if (parent.left) return this.hasNext(child_data, parent.left);
                else return false;
            } else {
                if (parent.right) return this.hasNext(child_data, parent.right);
                else return false;
            }
        }
    }

    hasNode(data){
        // TODO 2 Implement 
        if (this.root) return this.hasNext(data, this.root);
        else return false;
    }
}



module.exports = { Node, Tree }
