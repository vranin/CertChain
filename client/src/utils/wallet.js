import { ethers } from "ethers";

async function waitForEthereum(timeout = 1500) {
  if (window.ethereum) return window.ethereum;
  return new Promise((resolve) => {
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 100;
      if (window.ethereum) {
        clearInterval(interval);
        resolve(window.ethereum);
      } else if (elapsed >= timeout) {
        clearInterval(interval);
        resolve(null);
      }
    }, 100);
  });
}

export async function connectWallet() {
  const ethereum = await waitForEthereum();
  if (!ethereum) {
    throw new Error("MetaMask or Web3 wallet not detected. Please open this app in your normal browser tab (Chrome/Brave) where MetaMask is installed.");
  }

  const provider = new ethers.BrowserProvider(ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address,
    chainId: Number(network.chainId),
  };
}

export async function getConnectedWallet() {
  const ethereum = await waitForEthereum(500);
  if (!ethereum) return null;
  try {
    const provider = new ethers.BrowserProvider(ethereum);
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) return null;
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    return {
      provider,
      signer,
      address,
      chainId: Number(network.chainId),
    };
  } catch (err) {
    return null;
  }
}
