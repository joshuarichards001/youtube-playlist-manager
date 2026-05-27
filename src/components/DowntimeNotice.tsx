const DowntimeNotice = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">We&apos;re taking a break</h1>
        <p className="text-base-content/80">
          This site is unavailable between 10:00 PM and 10:00 AM (UK time).
          Please come back during opening hours.
        </p>
      </div>
    </div>
  );
};

export default DowntimeNotice;
