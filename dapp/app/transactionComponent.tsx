"use client";
import { useState } from "react";
import { parseGwei } from "viem";
import { ConnectWalletClient } from "./client";
export default function TransactionComponent() {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const setValue = (setter:any) => (evt:any) => setter(evt.target.value);

  async function handleClick() {
    try {
      const walletClient = ConnectWalletClient();
      const [address] = await walletClient.getAddresses();
      const hash = await walletClient.sendTransaction({
        account: address,
        to: recipient,
        value: parseGwei(amount), // GWei
      });
      alert(`Transaction successful. Transaction Hash: ${hash}`);
    } catch (error) {
      alert(`Transaction failed: ${error}`);
    }
  }

 return (
    <div className="card">
      <label>
        Amount:
        <input
          placeholder="GWei"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <br />
      <label>
        Recipient:
        <input
          placeholder="Address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </label>
      <br />
      <button
        className="px-8 py-2 rounded-md flex flex-row items-center justify-center"
        onClick={handleClick}
      >
        Send Transaction
      </button>
    </div>
  );
 }