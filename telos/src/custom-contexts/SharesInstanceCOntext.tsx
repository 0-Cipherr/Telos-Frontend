import { createContext } from "react";

const SharedInstanceContext = createContext(shareInstanceManager);

export function shareInstanceManager() {}
