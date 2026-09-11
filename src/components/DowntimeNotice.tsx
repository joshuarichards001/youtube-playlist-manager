const formatTimeLeft = (minutesLeft: number) => {
  const hours = Math.floor(minutesLeft / 60);
  const minutes = minutesLeft % 60;

  if (hours === 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"} and ${minutes} minute${minutes === 1 ? "" : "s"}`;
};

const DowntimeNotice = ({ minutesLeft }: { minutesLeft: number }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">We&apos;re taking a break</h1>
        <p className="text-base-content/80">
          This site is only available between 2:00 PM and 10:00 PM (UK time).
          Come back in {formatTimeLeft(minutesLeft)}.
        </p>
      </div>
    </div>
  );
};

export default DowntimeNotice;
