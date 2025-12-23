import { useEffect } from "react";
import useStore from "../helpers/store";
import { fetchUserAPI } from "../helpers/userAPI";
import HomePage from "./HomePage";
import LandingPage from "./LandingPage";

const App = () => {
  const accessToken = useStore((state) => state.accessToken);
  const setUser = useStore((state) => state.setUser);

  useEffect(() => {
    if (!accessToken) return;

    fetchUserAPI(accessToken).then((user) => {
      if (!user) return;

      setUser(user);
    });
  }, [accessToken, setUser]);

  return accessToken ? (
    <HomePage />
  ) : (
    <LandingPage />
  );
};

export default App;
