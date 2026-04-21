import { useState } from "react";
import { downloadBackup } from "../helpers/backup";
import useStore from "../helpers/store";

export default function Nav() {
  const user = useStore((state) => state.user);
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);
  const playlists = useStore((state) => state.playlists);
  const subscriptions = useStore((state) => state.subscriptions);
  const accessToken = useStore((state) => state.accessToken);
  const [backupLoading, setBackupLoading] = useState(false);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const handleBackup = async () => {
    if (!accessToken || backupLoading) return;
    setBackupLoading(true);
    try {
      await downloadBackup(accessToken, playlists, subscriptions);
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <nav className="navbar bg-base-200">
      <div className="flex-1 flex items-center">
        <button
          className="btn btn-ghost btn-square md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <a className="btn btn-ghost text-red-600 text-xl" href="/">
          YT Lite
        </a>
      </div>
      {user && <div className="flex flex-row gap-4">
        <p className="hidden sm:block">Welcome {user.name}!</p>
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
              <button onClick={handleBackup}>
                Backup
                {backupLoading && (
                  <span className="loading loading-spinner loading-xs"></span>
                )}
              </button>
            </li>
            <li>
              <button onClick={handleSignOut}>Sign Out</button>
            </li>
          </ul>
        </div>
      </div>}
    </nav>
  );
}
