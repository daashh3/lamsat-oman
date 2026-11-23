// Shared model/challenge coordinates in metres. Cords lace alternately around
// the front and rear of the rig before the last guide mounts them on the yard.
export const DHOW_WEAVE_RADIUS = 0.035;
export const DHOW_CORDS = [-0.23, -0.08, 0.07, 0.22].map((x, index) => {
  const top = 0.22 + ((x + 0.37) / 0.69) * 0.21;
  return {
    id: `cord-${index}`,
    start: [x, 0.16, 0.23],
    path: [
      [x - 0.018, top - 0.09, 0.125],
      [x + 0.018, top - 0.055, 0.045],
      [x - 0.014, top - 0.02, 0.13],
      [x, top + 0.002, 0.017],
    ],
  };
});
