const DC_CHOKE_INDUCTANCE_COLS = [
  'Inductance (mH)',
  'Inductance',
  'L (mH)',
  'L(mH)',
  'Endüktans (mH)',
  'Endüktans mH',
];

const DC_CHOKE_CURRENT_COLS = [
  'Current Rating (A)',
  'Current Rating',
  'Current (A)',
  'Rating (A)',
  'Current',
  'Akım (A)',
  'Rated Current (A)',
];

/**
 * DC şok katalog satırı seçimi (tek kaynak).
 * RectifierPricing.findBestDCChokeCatalogRow bu implementasyonu getColumn ile çağırır.
 *
 * @param {function(object, string[]): *} getColumn
 * @param {number} requiredInductanceMh
 * @param {number} requiredCurrentA
 * @param {object[]} chokes
 * @param {number} [toleranceMh=0.1]
 * @returns {{ row: object|null, reason: 'ok'|'empty'|'no-current-or-cost'|'no-tolerance' }}
 */
function findBestDCChokeCatalogRowImpl(getColumn, requiredInductanceMh, requiredCurrentA, chokes, toleranceMh) {
  const tol = toleranceMh === undefined ? 0.1 : Number(toleranceMh);
  const requiredCurrent = Number(requiredCurrentA || 0);
  const targetMh = Number(requiredInductanceMh || 0);
  if (!chokes || chokes.length === 0) {
    return { row: null, reason: 'empty', _stats: { afterCurrentFilter: 0, inToleranceBand: 0 } };
  }
  const filtered = chokes.filter((c) => {
    const inductance = getColumn(c, DC_CHOKE_INDUCTANCE_COLS);
    const currentRating = getColumn(c, DC_CHOKE_CURRENT_COLS);
    const costNum = Number(c.Cost);
    const hasCost = Number.isFinite(costNum) && costNum > 0;
    return (
      inductance != null &&
      inductance !== '' &&
      Number(currentRating || 0) + 1e-9 >= requiredCurrent &&
      hasCost
    );
  });
  if (filtered.length === 0) {
    return { row: null, reason: 'no-current-or-cost', _stats: { afterCurrentFilter: 0, inToleranceBand: 0 } };
  }
  const sorted = filtered.sort((a, b) => {
    const aInd = getColumn(a, DC_CHOKE_INDUCTANCE_COLS);
    const bInd = getColumn(b, DC_CHOKE_INDUCTANCE_COLS);
    return aInd - bInd;
  });
  const nearby = sorted
    .map((c) => {
      const cInd = Number(getColumn(c, DC_CHOKE_INDUCTANCE_COLS) || 0);
      const diff = Math.abs(cInd - targetMh);
      return { row: c, inductance: cInd, diff };
    })
    .filter((entry) => entry.inductance > 0 && entry.diff <= tol)
    .sort((a, b) => {
      const aI = Number(getColumn(a.row, DC_CHOKE_CURRENT_COLS) || 0);
      const bI = Number(getColumn(b.row, DC_CHOKE_CURRENT_COLS) || 0);
      if (aI !== bI) return aI - bI;
      if (a.diff !== b.diff) return a.diff - b.diff;
      const aC = Number(a.row?.Cost || 0);
      const bC = Number(b.row?.Cost || 0);
      if (aC !== bC) return aC - bC;
      return a.inductance - b.inductance;
    });
  if (nearby.length === 0) {
    return {
      row: null,
      reason: 'no-tolerance',
      _stats: { afterCurrentFilter: filtered.length, inToleranceBand: 0 },
    };
  }
  return {
    row: nearby[0].row,
    reason: 'ok',
    _stats: { afterCurrentFilter: filtered.length, inToleranceBand: nearby.length },
  };
}

(function attach(global) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { findBestDCChokeCatalogRowImpl };
  }
  global.findBestDCChokeCatalogRowImpl = findBestDCChokeCatalogRowImpl;
})(typeof globalThis !== 'undefined' ? globalThis : this);
