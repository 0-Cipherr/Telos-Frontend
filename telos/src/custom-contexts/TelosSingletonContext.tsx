import { useWallets, UseWalletsInterface } from "@privy-io/react-auth";
import { createContext, ReactNode, useEffect, useState } from "react";
import { OpenRouter } from "../../llm/OpenRouter";
import TelosAPI from "../api-handler/Telos/telos-api-methods";
import LLM from "../interfaces/LLM";
import { Stripe } from "../microservices/Stripe";
import { ModelManager } from "../onchain/ModelManager";
import { OnchainAgentManager } from "../onchain/OnchainAgentManager";
import { OnchainExecutor } from "../onchain/OnchainExecutor";
import { Registry } from "../onchain/Registry";
import { address } from "../types/solidity-types";
//implementing a singleton patter on shared instance for all classes across all pages
//they all will change dynamically and adapt to chnges because some classes depend on others
type SingletonManager = {
  telosAPIInstance: TelosAPI | null;
  modelManagerInstance: ModelManager | null;
  llmInstance: OpenRouter | null;
  onchainAgentManagerInstance: OnchainAgentManager | null;
  onchainExecutorInstance: OnchainExecutor | null;
  stripeInstance: Stripe | null;
  registryInstance: Registry | null;
};
//idea proposed managed instance for all of our sclasses accross all pages
//so all data is on the same page and is effeciently retrieved and used
export const TelosSingletonContext = createContext<any | null>(
  TelosSingletonManagerProvider,
);

export function TelosSingletonManagerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { wallets }: UseWalletsInterface = useWallets();
  const [singleton, setSingleton] = useState<SingletonManager | null>(null);

  useEffect(() => {
    if (wallets[0]?.address) {
      const clientEvent = async () => {
        await updateWalletClient();
      };
      clientEvent();
    }
  }, [wallets]);

  useEffect(() => {
    instantiateClasses();
  }, []);
  async function instantiateClasses() {
    const telosAPIInstance: TelosAPI | null = telosAPI();
    const modelManagerInstance = modelsManager();
    const llmInstance = LLM(
      "",
      "",
      "",
      telosAPIInstance as TelosAPI,
      modelManagerInstance,
    );
    const onchainAgentManagerInstance: OnchainAgentManager | null =
      onchainAgentManager(llmInstance as LLM);
    const onchainExecutorInstance: OnchainExecutor | null = onchainExecutor();
    const stripeInstance: Stripe | null = stripe();
    const registryInstance: Registry | null = registry(
      "" as address,
      "",
      "",
      "",
      onchainAgentManagerInstance as OnchainAgentManager,
      onchainExecutorInstance as OnchainExecutor,
      telosAPIInstance as TelosAPI,
    );
    setSingleton({
      telosAPIInstance,
      modelManagerInstance,
      llmInstance,
      onchainAgentManagerInstance,
      onchainExecutorInstance,
      stripeInstance,
      registryInstance,
    });
  }
  function onchainAgentManager(_llm: LLM): OnchainAgentManager | null {
    return new OnchainAgentManager(_llm);
  }

  function modelsManager(): ModelManager {
    return new ModelManager();
  }

  function telosAPI(): TelosAPI | null {
    return new TelosAPI("", "", ""); //initialize ke empty then when ser connect wallet we generate api key
  }

  function registry(
    _registry: `0x${string}`,
    _protocolFeeReciever: any,
    _protocolFee: any,
    _endpoint: any,
    _agentManager: OnchainAgentManager,
    _onchainExecutor: OnchainExecutor,
    _telosAPI: TelosAPI,
  ): Registry {
    return new Registry(
      _registry,
      _protocolFeeReciever,
      _protocolFee,
      _endpoint,
      _agentManager,
      _onchainExecutor,
      _telosAPI,
    );
  }

  function LLM(
    _apiKey: any,
    _model: any,
    _managementKey: any,
    _telos: TelosAPI,
    _models: ModelManager,
  ): OpenRouter | null {
    return new OpenRouter(_apiKey, _model, _managementKey, _telos, _models);
  }

  function onchainExecutor(): OnchainExecutor | null {
    return new OnchainExecutor();
  }

  function stripe() {
    return new Stripe();
  }

  function launchpads() {
    // try {
    //   const launchpads: Map<string, LaunchPad> = new Map<string, LaunchPad>();
    //   launchpads.set("pons", new Pons("",));
    //   launchpads.set("hoookrfun", new HookrFun("",[],onchainExe));
    // } catch (error) {
    //   console.log(error);
    //   return null;
    // }
  }

  async function reinstantiateClasses() {}

  async function updateWalletClient() {
    try {
      if (singleton) {
        const numericChainId = Number(wallets[0]?.chainId.split(":")[1]);
        if (singleton?.onchainExecutorInstance && wallets[0]?.address) {
          await singleton?.onchainExecutorInstance.createClient(
            wallets[0]?.address as address,
            numericChainId,
          );
        }
      } else {
        throw new Error("Single not properly instantiated!");
      }
    } catch (error) {
      console.log(error);
      throw new Error("Could not instantiate onchainExecutor!");
    }
  }
  return (
    <TelosSingletonContext.Provider
      value={{
        singleton,
      }}
    >
      {children}
    </TelosSingletonContext.Provider>
  );
}
