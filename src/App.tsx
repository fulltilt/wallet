import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { WalletManager } from "./components/WalletManager";
import { Buffer } from "buffer";
import { Toaster } from "sonner";
window.Buffer = Buffer;

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Navigation />
        <Routes>
          <Route path="/" element={<WalletManager />} />
          {/* <Route path="/create-token" element={<CreateToken />} /> */}
        </Routes>
        <Toaster />
      </div>
    </BrowserRouter>
  );
};

export default App;
