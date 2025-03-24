import useStore from "../helpers/store";
import Cookies from "js-cookie";

export default function Nav() {
  const user = useStore((state) => state.user);

  const handleSignOut = () => {
    Cookies.remove("accessToken");
    window.location.href = "/";
  };

  return (
    <nav className="navbar bg-base-200">
      <div className="flex-1">
        <a className="btn btn-ghost text-red-600 text-xl" href="/">
          Playlist Manager
        </a>
      </div>
      {user && <div className="flex flex-row gap-4">
        <p>Welcome {user.name}!</p>
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar"
          >
            <div className="w-10 rounded-full">
              <img alt="User Profile Picture" src={user.picture} />
            </div>
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-200 rounded-box z-[1] mt-3 w-52 p-2 shadow"
          >
            <li>
              <button onClick={handleSignOut}>Sign Out</button>
            </li>
          </ul>
        </div>
      </div>}
    </nav>
  );
}
