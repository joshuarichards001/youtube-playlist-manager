import useStore from "../helpers/store";
import Home from "./Home";
import LandingPage from "./LandingPage";
import Nav from "./Nav";

const App = () => {
  const accessToken = useStore((state) => state.accessToken);

  return (
    <main>
      <Nav />
      {accessToken ? <Home /> : <LandingPage />}
    </main>
  );
};

export default App;
