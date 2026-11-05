// Approximate coordinates for Nairobi areas (used for the delivery map)
const STORE = [-1.2864, 36.8172]; // Nairobi CBD
const AREAS = {
  westlands: [-1.2676, 36.8108], kilimani: [-1.2894, 36.7861], kileleshwa: [-1.2745, 36.7826], lavington: [-1.28, 36.769],
  karen: [-1.319, 36.708], langata: [-1.35, 36.75], kasarani: [-1.2218, 36.897], embakasi: [-1.319, 36.894],
  'south b': [-1.31, 36.833], 'south c': [-1.319, 36.819], parklands: [-1.263, 36.818], eastleigh: [-1.275, 36.848],
  roysambu: [-1.219, 36.887], ruaka: [-1.205, 36.775], 'thika road': [-1.23, 36.88], ngong: [-1.364, 36.658], cbd: STORE,
};
function locate(address, city) {
  const text = `${address} ${city}`.toLowerCase();
  for (const [name, c] of Object.entries(AREAS)) if (text.includes(name)) return c;
  return STORE;
}
module.exports = { STORE, locate };
