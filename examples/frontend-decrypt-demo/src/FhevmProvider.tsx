import { useState, useEffect, ReactNode } from "react";
import { createInstance } from "fhevmjs";
import { ethers } from "ethers";

interface FhevmContextType {
  instance: any;
  provider: any;
  signer: any;
  address: string;
  connected: boolean;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const FhevmContext = createContext<FhevmContextType | null>(null);

export function FhevmProvider({ children }: { children: ReactNode }) {
  const [instance, setInstance] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [address, setAddress] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!(window as any).ethereum) {
        throw new Error("No wallet detected. Install MetaMask or similar.");
      }

      const web3Provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await web3Provider.send("eth_requestAccounts", []);
      const web3Signer = await web3Provider.getSigner();
      const userAddress = await web3Signer.getAddress();

      const network = await web3Provider.getNetwork();
      const fhevmInstance = await createInstance({
        chainId: Number(network.chainId),
        publicKey: await web3Provider.call({
          to: "0x000000000000000000000000000000000000005d",
        }),
      });

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAddress(userAddress);
      setInstance(fhevmInstance);
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setAddress("");
    setInstance(null);
    setConnected(false);
  };

  return (
    <FhevmContext.Provider
      value={{ instance, provider, signer, address, connected, loading, error, connect, disconnect }}
    >
      {children}
    </FhevmContext.Provider>
  );
}

export function useFhevm() {
  const context = useContext(FhevmContext);
  if (!context) throw new Error("useFhevm must be used within FhevmProvider");
  return context;
}
