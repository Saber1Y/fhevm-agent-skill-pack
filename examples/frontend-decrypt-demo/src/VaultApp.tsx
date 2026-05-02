import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useFhevm } from "./FhevmProvider";
import { DecryptButton } from "./DecryptButton";

const VAULT_ABI = [
  "function deposit(externalEuint32 amount, bytes calldata inputProof) external",
  "function withdraw(externalEuint32 amount, bytes calldata inputProof) external",
  "function transfer(address to, externalEuint32 amount, bytes calldata inputProof) external",
  "function getBalance() external view returns (euint32)",
  "event Deposited(address indexed user)",
  "event Withdrawn(address indexed user)",
];

export function VaultApp({ contractAddress }: { contractAddress: string }) {
  const { instance, signer, address } = useFhevm();
  const [balance, setBalance] = useState<string | null>(null);
  const [encryptedHandle, setEncryptedHandle] = useState<bigint>(0n);
  const [amount, setAmount] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const contract = new ethers.Contract(contractAddress, VAULT_ABI, signer);

  useEffect(() => {
    if (address) {
      fetchBalance();
    }
  }, [address]);

  const fetchBalance = async () => {
    try {
      const handle = await contract.getBalance();
      setEncryptedHandle(handle);
      setBalance(null);
    } catch {
      setStatus("Failed to fetch balance");
    }
  };

  const handleDeposit = async () => {
    if (!instance || !amount) return;
    setLoading(true);
    setStatus("");

    try {
      const encrypted = instance.encrypt32(parseInt(amount));
      const tx = await contract.deposit(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();
      setStatus(`Deposited ${amount} successfully`);
      setAmount("");
      await fetchBalance();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!instance || !amount) return;
    setLoading(true);
    setStatus("");

    try {
      const encrypted = instance.encrypt32(parseInt(amount));
      const tx = await contract.withdraw(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();
      setStatus(`Withdrew ${amount} successfully`);
      setAmount("");
      await fetchBalance();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!instance || !amount || !transferTo) return;
    setLoading(true);
    setStatus("");

    try {
      const encrypted = instance.encrypt32(parseInt(amount));
      const tx = await contract.transfer(
        transferTo,
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();
      setStatus(`Transferred ${amount} to ${transferTo}`);
      setAmount("");
      setTransferTo("");
      await fetchBalance();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h1>Confidential Vault</h1>
      <p>Connected: {address}</p>

      <section>
        <h2>Balance</h2>
        {balance !== null ? (
          <p>Your balance: {balance}</p>
        ) : (
          <DecryptButton
            encryptedHandle={encryptedHandle}
            type="euint32"
            contractAddress={contractAddress}
            onDecrypt={(value) => setBalance(value.toString())}
            label="Decrypt Balance"
          />
        )}
      </section>

      <section>
        <h2>Deposit</h2>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
        />
        <button onClick={handleDeposit} disabled={loading}>
          Deposit
        </button>
      </section>

      <section>
        <h2>Withdraw</h2>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
        />
        <button onClick={handleWithdraw} disabled={loading}>
          Withdraw
        </button>
      </section>

      <section>
        <h2>Transfer</h2>
        <input
          type="text"
          value={transferTo}
          onChange={(e) => setTransferTo(e.target.value)}
          placeholder="Recipient address"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
        />
        <button onClick={handleTransfer} disabled={loading}>
          Transfer
        </button>
      </section>

      {status && <p>{status}</p>}
    </div>
  );
}
