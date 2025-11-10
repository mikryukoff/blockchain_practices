const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TokenDeploy", (mbuilder) => {
    const account0 = mbuilder.getAccount(0);     // or account = "0x123..." 
    const erc20_smart_contract = mbuilder.contract("Token", [], {from: account0});
    return { erc20_smart_contract };
  });