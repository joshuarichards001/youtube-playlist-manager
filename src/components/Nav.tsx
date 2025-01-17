export default function Nav() {
  return (
    <nav className="navbar bg-base-200">
      <div className="flex-1">
        <a className="btn btn-ghost text-red-600 text-xl" href="/">Playlist Sort</a>
      </div>
      <div role="button" className="btn btn-ghost btn-circle avatar">
        <div className="w-10 rounded-full">
          <img
            alt="User Profile Picture"
            src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
          />
        </div>
      </div>
    </nav>
  );
}
