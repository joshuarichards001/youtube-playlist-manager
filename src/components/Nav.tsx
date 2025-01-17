import useStore from "../helpers/store";

export default function Nav() {
  const user = useStore((state) => state.user);

  return (
    <nav className="navbar bg-base-200">
      <div className="flex-1">
        <a className="btn btn-ghost text-red-600 text-xl" href="/">
          Playlist Sort
        </a>
      </div>
      {user && (
        <div className="flex flex-row gap-4">
          <p>Welcome {user.name}!</p>
          <div role="button" className="btn btn-ghost btn-circle avatar">
            <div className="w-10 rounded-full">
              <img alt="User Profile Picture" src={user.picture} />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
