export default function PrivacyPolicy() {
  return (
    <div className="p-10 flex flex-col gap-6 max-w-[1000px] mx-auto">
      <a className="link link-primary" href="/">Back to Home</a>
      <p>
        Privacy Policy Effective Date: Jan 18th, 2024 At YouTube Playlist
        Manager.
      </p>
      <p>
        We do not collect or store any personal user information. The only data
        we receive is through Plausible Analytics, which provides anonymous
        website usage statistics. Plausible does not use cookies and does not
        track personal or identifiable data.
      </p>
      <p>
        Additionally, our service interacts directly with the YouTube API to
        fetch and manage your playlists. All interactions, including creating,
        moving, and deleting videos from playlists, as well as creating and
        deleting playlists, occur directly between the user and the YouTube API.
        We do not have a backend service and do not collect, store, or retain
        any data fetched from the YouTube API about the users.
      </p>
      <p>
        The anonymous analytics data from Plausible is used solely to understand
        website traffic and improve user experience. We do not share, sell, or
        distribute this data to any third parties.
      </p>
      <p>
        We may update this Privacy Policy from time to time. Any changes will be
        posted on this page.
      </p>
      <p>
        If you have any questions about this Privacy Policy, you can contact us
        at "hello@josh.work".
      </p>
    </div>
  );
}
