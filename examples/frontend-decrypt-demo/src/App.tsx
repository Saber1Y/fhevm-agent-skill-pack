import React from 'react';
import { FhevmProvider } from './FhevmProvider';
import { VaultApp } from './VaultApp';

function App() {
  return (
    <FhevmProvider>
      <div className="App">
        <h1>FHEVM Confidential Vault</h1>
        <VaultApp contractAddress={process.env.REACT_APP_CONTRACT_ADDRESS || ''} />
      </div>
    </FhevmProvider>
  );
}

export default App;
