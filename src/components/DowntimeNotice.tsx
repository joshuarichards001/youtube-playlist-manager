const formatTimeLeft = (minutesLeft: number) => {
  const hours = Math.floor(minutesLeft / 60);
  const minutes = minutesLeft % 60;

  if (hours === 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"} and ${minutes} minute${minutes === 1 ? "" : "s"}`;
};

// minutesLeft is null when there is no Recreation Time in the coming week.
// fallbackReason is set when NextDNS couldn't be read and default hours apply.
const DowntimeNotice = ({
  minutesLeft,
  fallbackReason,
}: {
  minutesLeft: number | null;
  fallbackReason?: string;
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">We&apos;re taking a break</h1>
        <p className="text-base-content/80">
          This site is only available during YouTube recreation time.{" "}
          {minutesLeft === null
            ? "There's none scheduled right now."
            : `Come back in ${formatTimeLeft(minutesLeft)}.`}
        </p>
        {fallbackReason && (
          <p className="mt-6 text-sm text-base-content/60">
            Couldn&apos;t load the NextDNS schedule ({fallbackReason}), so the
            default 2pm–10pm hours apply.
          </p>
        )}
      </div>
    </div>
  );
};

export default DowntimeNotice;
