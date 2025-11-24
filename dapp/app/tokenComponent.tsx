"use client";
import { getContract, Address } from "viem";
import { contractAbi } from "./abi";
import { ConnectWalletClient } from "./client";
import { useState } from "react";

export default function TokenComponent() {
  const [contractAddress, setContractAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const setValue = (setter: any) => (evt: any) => setter(evt.target.value);

  const walletClient = ConnectWalletClient();

  async function buttonClick() {
    try {
      const checkedAddress = contractAddress as Address;

      const contract = getContract({
        address: checkedAddress,
        abi: contractAbi,
        client: walletClient,
      });
      console.log("Connected to Contract: ", contract);

      const symbol = await contract.read.symbol();
      const name = await contract.read.name();

      console.log(`Symbol: ${symbol}\nName: ${name}\n`);

      const token_id = BigInt(tokenId);
      const owner = await contract.read.ownerOf([token_id]);

      alert(
        `Symbol: ${symbol}\nName: ${name}\nOwner of token ID ${token_id} = ${owner}`
      );
    } catch (error) {
      console.error("Error fetching token info: ", error);
      alert("Failed to fetch token information. Please check the input values.");
    }
  }

  return (
    <div className="card">
      <label>
        Address:
        <input
          placeholder="Smart Contract Address"
          value={contractAddress}
          onChange={setValue(setContractAddress)}
          className="input"
        />
      </label>
      <br />
      <label>
        Token ID:
        <input
          placeholder="1"
          value={tokenId}
          onChange={setValue(setTokenId)}
          className="input"
        />
      </label>
      <br />
      <button
        className="px-8 py-2 rounded-md flex flex-row items-center justify-center bg-blue-500 text-white"
        onClick={buttonClick}
      >
        <h1 className="text-center">Token Info</h1>
      </button>
    </div>
  );
}
