import LoginButton from "./LoginButton";
import PrivacyPolicy from "./PrivacyPolicy";

export default function LandingPage() {
  if (window.location.pathname === "/privacy-policy") {
    return <PrivacyPolicy />;
  }

  return (
    <main className="flex flex-col items-center justify-center w-full h-full px-10 py-20">
      <h1 className="text-8xl font-bold mb-6">YT Lite</h1>
      <h2 className="text-2xl font-bold mb-10 text-primary">
        Effortlessly organize your YouTube Playlists
      </h2>
      <img src="screenshot.png" className="w-full max-w-[1000px] mb-14" />
      <LoginButton />
      <p className="max-w-[500px] text-center my-10">
        A YouTube Playlist Manager to help you sort, categorize, move, and bulk
        edit the videos in your YouTube playlists to help you stay organized!
      </p>
      <a className="link text-base-content/70 mt-10" href="/privacy-policy">
        Privacy Policy
      </a>
    </main>
  );
}
