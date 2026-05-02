import { useState, useCallback } from "react";
import { Handle } from "fhevmjs";
import { useFhevm } from "./FhevmProvider";

interface DecryptButtonProps {
  encryptedHandle: bigint;
  type: "euint32" | "euint64" | "euint256" | "ebool";
  contractAddress: string;
  onDecrypt: (value: bigint) => void;
  label?: string;
}

export function DecryptButton({
  encryptedHandle,
  type,
  contractAddress,
  onDecrypt,
  label = "Decrypt Value",
}: DecryptButtonProps) {
  const { instance, address } = useFhevm();
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecrypt = useCallback(async () => {
    if (!instance || !address) return;
    setDecrypting(true);
    setError(null);

    try {
      let decrypted: bigint;

      switch (type) {
        case "euint32":
          decrypted = await instance.userDecryptEuint(
            Handle.euint32(encryptedHandle),
            contractAddress,
            address
          );
          break;
        case "euint64":
          decrypted = await instance.userDecryptEuint(
            Handle.euint64(encryptedHandle),
            contractAddress,
            address
          );
          break;
        case "euint256":
          decrypted = await instance.userDecryptEuint(
            Handle.euint256(encryptedHandle),
            contractAddress,
            address
          );
          break;
        case "ebool":
          decrypted = await instance.userDecryptEbool(
            Handle.ebool(encryptedHandle),
            contractAddress,
            address
          );
          break;
      }

      onDecrypt(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decryption failed");
    } finally {
      setDecrypting(false);
    }
  }, [instance, address, encryptedHandle, type, contractAddress, onDecrypt]);

  return (
    <div>
      <button onClick={handleDecrypt} disabled={decrypting || !instance}>
        {decrypting ? "Decrypting..." : label}
      </button>
      {error && <p style={{ color: "red", fontSize: "0.875rem" }}>{error}</p>}
    </div>
  );
}
