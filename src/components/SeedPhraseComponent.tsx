import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Check, ChevronUp, Copy } from "lucide-react";
import { useCallback, useState } from "react";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";

type SeedPhraseComponentProps = {
  setSeedHex: (str: string) => void;
};

export const SeedPhraseComponent = ({
  setSeedHex,
}: SeedPhraseComponentProps) => {
  const [input, setInput] = useState("");
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase.join(" "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("copy failed", err);
    }
  }, [seedPhrase]);

  const generateSeedPhrase = useCallback(() => {
    if (!input.trim()) {
      const mnemonic = generateMnemonic();
      const words = mnemonic.split(" ");
      setSeedPhrase(words);

      const seed = mnemonicToSeedSync(mnemonic); // Buffer
      setSeedHex(seed.toString("hex"));
      setIsOpen(true);
      return;
    }

    const words = input.trim().split(/\s+/);
    if (words.length === 12) {
      setSeedPhrase(words);
      const seed = mnemonicToSeedSync(words.join(" "));
      setSeedHex(seed.toString("hex"));
      setIsOpen(true);
    } else {
      console.warn("seed phrase must be 12 words long");
    }
  }, [input]);

  return (
    <>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Input
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your secret phrase (or leave blank to generate)"
            className="h-12 pl-4 pr-12 text-base shadow-sm border-2 focus-visible:ring-2 focus-visible:ring-violet-500"
          />
        </div>
        <Button
          onClick={generateSeedPhrase}
          size="lg"
          className="h-12 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/50 transition-all"
        >
          {input.length === 0 ? "Generate Seed" : "Set Seed"}
        </Button>
      </div>

      {/* Seed Phrase Card */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="border-2 shadow-xl bg-gradient-to-br from-card to-card/50 backdrop-blur">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-6 hover:bg-transparent"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/10 rounded-lg">
                  <Copy className="w-5 h-5 text-violet-600" />
                </div>
                <span className="text-lg font-semibold">
                  Secret Recovery Phrase
                </span>
              </div>
              <ChevronUp
                className={`h-5 w-5 transition-transform duration-300 ${
                  isOpen ? "" : "rotate-180"
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {seedPhrase.map((word, index) => (
                  <div
                    key={index}
                    className="group relative bg-gradient-to-br from-muted to-muted/50 border-2 border-border/50 rounded-xl px-4 py-3 text-center hover:border-violet-500/50 hover:shadow-md transition-all"
                  >
                    <span className="text-xs text-muted-foreground font-medium">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold mt-1">{word}</p>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleCopy}
                variant="outline"
                className="w-full h-11 border-2 hover:bg-violet-50 hover:border-violet-500 dark:hover:bg-violet-950/20 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                    <span className="text-green-600 font-medium">
                      Copied to Clipboard!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Recovery Phrase
                  </>
                )}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </>
  );
};
