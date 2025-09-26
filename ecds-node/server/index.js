const express = require("express");
const app = express();
const cors = require("cors");
const port = 3042;
const keccak256 = require("ethereum-cryptography/keccak.js").keccak256;
const secp256k1 = require("ethereum-cryptography/secp256k1").secp256k1;
const { utf8ToBytes } = require("ethereum-cryptography/utils");

app.use(cors());
app.use(express.json());

const balances = {
  "02fb3cac2b49ee7a5978136e858c5a325a02499f821db804dee395fbdb62372f73": 100,
  "036d87c721bc9310202278f7881d51f964ada55b500420f69294cec0b500ba470a": 50,
  "039540d490dc897caa519e1f1625cfb2370d6e7238fbff8b6b211cb38bea6498b5": 75,
};

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post("/send", (req, res) => {
  const signedTransaction = req.body;
  console.log(signedTransaction);
  const { sender, recipient, amount, hexSign } = signedTransaction;

  try {
    const transactionData = {
      sender: sender,
      amount: amount,
      recipient: recipient
    };
    
    const transactionString = JSON.stringify(transactionData, Object.keys(transactionData).sort());
    
    const transactionHash = keccak256(utf8ToBytes(transactionString));
    
    const signature = Uint8Array.from(Buffer.from(hexSign, 'hex'));
    const publicKey = Uint8Array.from(Buffer.from(sender, 'hex'));
    
    const isSigned = secp256k1.verify(signature, transactionHash, publicKey);
    console.log("Is signature valid: ", isSigned);

    if (isSigned) {
      setInitialBalance(sender);
      setInitialBalance(recipient);

      if (balances[sender] < amount) {
        res.status(400).send({ message: "Not enough funds!" });
      } else {
        balances[sender] -= amount;
        balances[recipient] += amount;
        res.send({ 
          balance: balances[sender],
          message: "Transaction successful!" 
        });
      }
    } else {
      res.status(400).send({ message: "Invalid signature!" });
    }
  } catch (error) {
    console.error("Error processing transaction:", error);
    res.status(400).send({ message: "Error processing transaction" });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

function setInitialBalance(address) {
  if (!balances[address]) {
    balances[address] = 0;
  }
}
