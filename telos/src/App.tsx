import { usePrivy } from '@privy-io/react-auth';
import Home from './Home';

export default function App() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  return (
    <Home
      ready={ready}
      authenticated={authenticated}
      login={() => login()}
      logout={() => logout()}
      address={user?.wallet?.address}
    />
  );
}
