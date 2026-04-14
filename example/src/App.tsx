import { useMemo, useState } from "react";
import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { SdkProvider } from "@p2pdotme/sdk/react";
import { OrderRouting } from "./components/order-routing/order-routing";
import { Payload } from "./components/payload/payload";
import { Profile } from "./components/profile/profile";
import "./index.css";

const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL ?? "";
const DIAMOND_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS ?? "0x") as Address;
const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS ?? "0x") as Address;
const RPC_URL = import.meta.env.VITE_RPC_URL ?? "";

const TABS = ["Profile", "Order Routing", "Payload"] as const;
type Tab = (typeof TABS)[number];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("Profile");

  const publicClient = useMemo(
    () => createPublicClient({ chain: base, transport: http(RPC_URL) }),
    [],
  );

  return (
    <SdkProvider
      publicClient={publicClient}
      subgraphUrl={SUBGRAPH_URL}
      diamondAddress={DIAMOND_ADDRESS}
      usdcAddress={USDC_ADDRESS}
      logger={console}
    >
      <nav className="navbar">
        <span className="navbar-title">p2pdotme SDK</span>
        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab ${activeTab === tab ? "tab-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>
      <div className="container">
        {activeTab === "Profile" && <Profile />}
        {activeTab === "Order Routing" && <OrderRouting />}
        {activeTab === "Payload" && <Payload />}
      </div>
    </SdkProvider>
  );
}
