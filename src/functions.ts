export const convertDurationToSeconds = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) {
    return 0;
  }

  const hours = parseInt((match[1] || "0H").slice(0, -1), 10);
  const minutes = parseInt((match[2] || "0M").slice(0, -1), 10);
  const seconds = parseInt((match[3] || "0S").slice(0, -1), 10);

  return hours * 3600 + minutes * 60 + seconds;
};

export const convertDurationToTimeString = (durationSeconds: number): string => {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
};
