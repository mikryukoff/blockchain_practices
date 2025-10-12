import { ethers } from "ethers";
import { useState } from 'react';

function BalanceReader({ provider }) {
    const [address, setAddress] = useState("");
    const [balance, setBalance] = useState(0);

    async function onChange(evt) {
        const address = evt.target.value;
        console.log("address: ", address);
        setAddress(address);

        try {
            const balance = await provider.getBalance(address);
            console.log("balance: ", balance);
            const newBalance = ethers.formatEther(balance);
            setBalance(newBalance);
        } catch(err){
            console.log(err);
        }
    }

    return (
        <div className="container">
        <h1>Balance Reader</h1>
        <label>
            Address: 
            <input placeholder="Type any address" value={address} onChange={onChange}></input>
        </label>
        <div className="balance">Balance: {balance} ETH</div>
        </div>
  );
}
export default BalanceReader;
