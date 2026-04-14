/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUBGRAPH_URL: string;
	readonly VITE_CONTRACT_ADDRESS: string;
	readonly VITE_RPC_URL: string;
	readonly VITE_USDC_ADDRESS: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
