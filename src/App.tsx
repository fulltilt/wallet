import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Check, ChevronUp, Copy } from "lucide-react";
import { Buffer } from "buffer";
import { Card, CardContent } from "./components/ui/card";

import nacl from "tweetnacl";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
window.Buffer = Buffer;

type Wallet = {
  id: number;
  publicKey: string;
  privateKey: string;
};

function App() {
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [seed, setSeed] = useState("");
  const [copied, setCopied] = useState(false);
  const [walletNum, setWalletNum] = useState(0);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const generateSeedPhrase = () => {
    if (input.length === 0) {
      const mnemonic = generateMnemonic();
      setSeedPhrase(mnemonic.split(" "));

      const seed = mnemonicToSeedSync(mnemonic); // returns a Buffer
      setSeed(seed.toString("hex"));

      setIsOpen(true);
    } else {
      const words = input.split(" ");
      if (words.length === 12) setSeedPhrase(words);
      else console.log("seed phrase must be 12 words long");
    }
  };

  const addWallet = () => {
    // 501 = Solana
    // 1 - Bitcoin
    // 60 - Ethereum
    const path = `m/44'/501'/${walletNum}'/0'`;
    const derivedSeed = derivePath(path, seed).key;
    const privateKey = nacl.sign.keyPair.fromSeed(derivedSeed).secretKey; // returns a Uint8Array
    const publicKey = Keypair.fromSecretKey(privateKey).publicKey.toBase58();

    setWallets([
      ...wallets,
      {
        id: walletNum,
        privateKey: Buffer.from(privateKey).toString("hex"),
        publicKey,
      },
    ]);
    setWalletNum((prev) => prev + 1);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase.join(" "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex">
        <Input
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your secret phrase (or leave blank to generate)"
        />
        <Button onClick={generateSeedPhrase}>
          {input.length === 0 ? "Generate Seed" : "Set Seed"}
        </Button>
      </div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-gray-900 border-gray-800">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-6 text-white hover:bg-gray-800 rounded-none"
            >
              <span className="text-lg font-medium">Current Secret Phrase</span>
              <ChevronUp
                className={`h-5 w-5 transition-transform duration-200 ${
                  isOpen ? "transform rotate-0" : "transform rotate-180"
                }`}
              />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="p-6 pt-0">
              {/* Seed phrase grid */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {seedPhrase.map((word, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-center"
                  >
                    <span className="text-white text-sm font-medium">
                      {word}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleCopy}
                variant="outline"
                className="w-full bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Click Anywhere To Copy
                  </>
                )}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      <div className="flex mt-4 mb-4 gap-4">
        <Button onClick={addWallet}>Add Wallet</Button>
        <Button>Clear Wallets</Button>
      </div>
      <h1>Wallets</h1>
      {wallets.map((wallet) => (
        <Card key={wallet.id} className="mb-4 bg-gray-900 border-gray-800">
          <CardContent>
            <h1>{wallet.id}</h1>
            <p>Public Key: {wallet.publicKey}</p>
            <p>Private Key: {wallet.privateKey}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default App;
