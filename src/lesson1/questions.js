export const STANDARD_FREQUENCIES = [100, 250, 500, 1000, 2000, 4000, 8000];

export const exercises = {
  1: {
    title: "גבוה, אמצע או נמוך?",
    instruction: "הקשיבו לצליל ובחרו אם הוא נמוך, באמצע או גבוה.",
  },
  2: {
    title: "איזה צליל גבוה יותר?",
    instruction: "הקשיבו לשני הצלילים ובחרו איזה מהם גבוה יותר.",
  },
  3: {
    title: "מה התדר?",
    instruction: "הקשיבו לצליל ונסו לזהות את התדר שלו.",
  },
};

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const pick = (items, random) => items[Math.floor(random() * items.length)];
export const frequencyLabel = (hz) => `${hz.toLocaleString("en-US")}Hz`;
const frequencyMarkup = (hz) => `<bdi dir="ltr">${frequencyLabel(hz)}</bdi>`;

function rangeQuestions(random) {
  // Stay inside the requested bands, away from their edges. Each band appears at least 3 times.
  const bands = [
    { id: "low", label: "נמוך", description: "נמוך", min: 110, max: 240 },
    { id: "mid", label: "אמצע", description: "באמצע", min: 550, max: 1900 },
    { id: "high", label: "גבוה", description: "גבוה", min: 4200, max: 7800 },
  ];
  return shuffle(
    [...bands, ...bands, ...bands, pick(bands, random)],
    random,
  ).map((band) => {
    // Logarithmic sampling gives low and high parts of a pitch band similar weight.
    const frequency = Math.round(
      Math.exp(Math.log(band.min) + random() * Math.log(band.max / band.min)),
    );
    return {
      tones: [frequency],
      choices: bands.map(({ id, label }) => ({ id, label })),
      answer: band.id,
      explanation: `שמעתם צליל ${band.description} בתדר ${frequencyMarkup(frequency)}.`,
    };
  });
}

function comparisonQuestions(random) {
  const pools = [
    [
      [200, 1000],
      [500, 4000],
      [150, 1200],
      [250, 2000],
    ],
    [
      [500, 1000],
      [1000, 2000],
      [250, 500],
      [750, 1500],
    ],
    [
      [500, 750],
      [1000, 1500],
      [800, 1200],
      [2000, 3000],
    ],
  ];
  // A balanced, shuffled answer order avoids an accidentally one-sided session.
  const higherPositions = shuffle([0, 0, 0, 0, 0, 1, 1, 1, 1, 1], random);
  return higherPositions.map((higher, index) => {
    const [low, high] = pick(pools[index < 4 ? 0 : index < 7 ? 1 : 2], random);
    const tones = higher === 0 ? [high, low] : [low, high];
    return {
      tones,
      choices: [
        { id: "0", label: "צליל א׳ גבוה יותר" },
        { id: "1", label: "צליל ב׳ גבוה יותר" },
      ],
      answer: String(higher),
      explanation: `צליל א׳: ${frequencyMarkup(tones[0])}<br>צליל ב׳: ${frequencyMarkup(tones[1])}<br>צליל ${higher === 0 ? "א׳" : "ב׳"} היה גבוה יותר.`,
    };
  });
}

function exactQuestions(random) {
  const targets = shuffle(
    [
      ...STANDARD_FREQUENCIES,
      ...shuffle(STANDARD_FREQUENCIES, random).slice(0, 3),
    ],
    random,
  );
  return targets.map((frequency) => {
    const index = STANDARD_FREQUENCIES.indexOf(frequency);
    const neighbors = STANDARD_FREQUENCIES.filter(
      (hz, i) => hz !== frequency && Math.abs(i - index) <= 2,
    );
    const nearby = pick(neighbors, random);
    const others = shuffle(
      STANDARD_FREQUENCIES.filter((hz) => hz !== frequency && hz !== nearby),
      random,
    ).slice(0, 2);
    return {
      tones: [frequency],
      choices: shuffle([frequency, nearby, ...others], random).map((hz) => ({
        id: String(hz),
        label: frequencyMarkup(hz),
      })),
      answer: String(frequency),
      explanation: `התדר הנכון הוא ${frequencyMarkup(frequency)}.`,
    };
  });
}

export function generateQuestions(exerciseId, random = Math.random) {
  const generators = {
    1: rangeQuestions,
    2: comparisonQuestions,
    3: exactQuestions,
  };
  return generators[exerciseId](random);
}
