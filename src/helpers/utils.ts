export function getRandomInteger(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const _ = (id: string) => document.getElementById(id);

export const isCloudPhone = () =>
  navigator.userAgent.toLowerCase().includes("cloud phone");
