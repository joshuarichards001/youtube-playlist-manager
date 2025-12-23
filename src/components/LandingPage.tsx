import LoginButton from "./LoginButton";
import PrivacyPolicy from "./PrivacyPolicy";

export default function LandingPage() {
  // if the link is privacy-policy, it will render the PrivacyPolicy component
  if (window.location.pathname === "/privacy-policy") {
    return <PrivacyPolicy />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-10 py-20">
      <h1 className="text-8xl font-bold mb-4">YT Lite</h1>
      <h2 className="text-2xl font-bold mb-14 text-primary">
        Organize your YouTube Playlists at Speed
      </h2>
      <p className="max-w-[500px] text-center mb-10">
        A YouTube playlist manager to help you sort, categorize, move, and bulk
        edit the videos in your YouTube playlists to help you stay organized!
      </p>
      <LoginButton />
      <a className="link text-base-content/70 mt-10" href="/privacy-policy">
        Privacy Policy
      </a>
    </div>
  );
}
