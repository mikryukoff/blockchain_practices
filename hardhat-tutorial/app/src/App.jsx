import { useState } from 'react'
import './App.css'
import { ethers } from 'ethers';

const provider = new ethers.providers.Web3Provider(window.ethereum);

const ABI = [
  // ERC20 Standart Read-Only Functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",

  // Authenticated Functions
  "function transfer(address to, uint amount) returns (bool)",

  // Events
  "event Transfer(address indexed from, address indexed to, uint amount)"
];

// This can be an address or an ENS name
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

function App() {
  const [account, setAccount] = useState('')
  const [tokens, setTokens] = useState('no')
  const [signer, setSigner] = useState('')
  const [contract, setContract] = useState('')

  async function transferToken(){
    const address = document.getElementById("address").value;
    const amount  = document.getElementById("amount").value;
    console.log("Signer: ", signer);
    console.log("Contract: ", contract);

    const trx = await contract.connect(signer).transfer(address, amount);
    console.log("Transaction: ", trx);
    await trx.wait();
    updateAccount();
  }

  async function updateAccount() {
    const accounts = await provider.send('eth_requestAccounts', []);
    console.log("Available accounts: ", accounts);
    const account = accounts[0];
    setAccount(account);
    
    const signer = provider.getSigner();
    setSigner(signer);
    console.log("Signer: ", signer);

    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    console.log("Contract: ", contract);
    setContract(contract);

    if (contract){
      const tokens = await contract.balanceOf(account);
      console.log("Tokens: ", tokens);
      setTokens(tokens.toString());
    }
  }   

  return (
    <>
    <h1>Token vending machine</h1>
    <h3>Current account {account} has {tokens} Tokens</h3>
    <button
        onClick={(e) => {
          e.preventDefault();
          updateAccount();
        }}
      >Update Balance
      </button>
    <div>
      <label>Send to: 
          <input type="text" id="address"/>
      </label>

      <label>Amount:
          <input type="text" id="amount"/>
      </label>

      <button
          onClick={(e) => {
          e.preventDefault();
          transferToken();
          }}
          > Transfer
      </button>
    </div>
    </>
  )
}

export default App
