(function fitParserFactory(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FormedFitParser = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createFitParser() {
  const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);

  const BASE_TYPES = {
    0x00: { name: "enum", size: 1, invalid: 0xff, read: (view, offset) => view.getUint8(offset) },
    0x01: { name: "sint8", size: 1, invalid: 0x7f, read: (view, offset) => view.getInt8(offset) },
    0x02: { name: "uint8", size: 1, invalid: 0xff, read: (view, offset) => view.getUint8(offset) },
    0x83: { name: "sint16", size: 2, invalid: 0x7fff, read: (view, offset, little) => view.getInt16(offset, little) },
    0x84: { name: "uint16", size: 2, invalid: 0xffff, read: (view, offset, little) => view.getUint16(offset, little) },
    0x85: { name: "sint32", size: 4, invalid: 0x7fffffff, read: (view, offset, little) => view.getInt32(offset, little) },
    0x86: { name: "uint32", size: 4, invalid: 0xffffffff, read: (view, offset, little) => view.getUint32(offset, little) },
    0x07: { name: "string", size: 1 },
    0x88: { name: "float32", size: 4, invalid: NaN, read: (view, offset, little) => view.getFloat32(offset, little) },
    0x89: { name: "float64", size: 8, invalid: NaN, read: (view, offset, little) => view.getFloat64(offset, little) },
    0x0a: { name: "uint8z", size: 1, invalid: 0, read: (view, offset) => view.getUint8(offset) },
    0x8b: { name: "uint16z", size: 2, invalid: 0, read: (view, offset, little) => view.getUint16(offset, little) },
    0x8c: { name: "uint32z", size: 4, invalid: 0, read: (view, offset, little) => view.getUint32(offset, little) },
    0x0d: { name: "byte", size: 1, read: (view, offset) => view.getUint8(offset) }
  };

  const SPORT_NAMES = {
    1: "running",
    2: "cycling",
    4: "fitness equipment",
    5: "swimming",
    10: "training",
    11: "walking",
    15: "rowing",
    17: "hiking",
    26: "cardio training"
  };

  const SUB_SPORT_NAMES = {
    19: "flexibility training",
    20: "strength training",
    26: "cardio training",
    43: "yoga",
    44: "pilates",
    45: "indoor running",
    58: "virtual activity"
  };

  function getView(buffer) {
    if (buffer instanceof ArrayBuffer) return new DataView(buffer);
    if (ArrayBuffer.isView(buffer)) {
      return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    throw new Error("FIT parser expected an ArrayBuffer or Uint8Array.");
  }

  function readString(view, offset, size) {
    const bytes = [];
    for (let i = 0; i < size; i += 1) {
      const value = view.getUint8(offset + i);
      if (value === 0) break;
      bytes.push(value);
    }
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  }

  function normalizeValue(type, value) {
    if (Number.isNaN(type.invalid)) return Number.isNaN(value) ? null : value;
    return value === type.invalid ? null : value;
  }

  function readValue(view, offset, size, baseType, architecture) {
    const type = BASE_TYPES[baseType];
    if (!type) return null;
    if (type.name === "string") return readString(view, offset, size);

    const littleEndian = architecture === 0;
    const count = Math.max(1, Math.floor(size / type.size));
    const values = [];
    for (let index = 0; index < count; index += 1) {
      const valueOffset = offset + index * type.size;
      values.push(normalizeValue(type, type.read(view, valueOffset, littleEndian)));
    }
    return values.length === 1 ? values[0] : values;
  }

  function fitDate(seconds) {
    return seconds == null ? null : new Date(FIT_EPOCH_MS + seconds * 1000).toISOString();
  }

  function displaySport(session) {
    const title = session?.[110];
    if (title) return title;
    const subSport = SUB_SPORT_NAMES[session?.[6]];
    const sport = SPORT_NAMES[session?.[5]];
    if (subSport) return subSport.replace(/\b\w/g, (char) => char.toUpperCase());
    if (sport) return sport.replace(/\b\w/g, (char) => char.toUpperCase());
    return "Training session";
  }

  function titleCase(value) {
    return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function round(value, digits = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    const factor = 10 ** digits;
    return Math.round(number * factor) / factor;
  }

  function sum(values) {
    return values.reduce((total, value) => total + (Number(value) || 0), 0);
  }

  function average(values) {
    const numeric = values.map(Number).filter(Number.isFinite);
    if (!numeric.length) return null;
    return sum(numeric) / numeric.length;
  }

  function parseFit(buffer) {
    const view = getView(buffer);
    const headerSize = view.getUint8(0);
    if (readString(view, 8, 4) !== ".FIT") {
      throw new Error("That file does not look like a Garmin FIT activity.");
    }

    const dataSize = view.getUint32(4, true);
    const end = Math.min(view.byteLength, headerSize + dataSize);
    let offset = headerSize;
    const localDefinitions = new Map();
    const messages = [];

    while (offset < end) {
      const header = view.getUint8(offset);
      offset += 1;

      let localNumber;
      let isDefinition;
      if (header & 0x80) {
        localNumber = (header >> 5) & 0x03;
        isDefinition = false;
      } else {
        localNumber = header & 0x0f;
        isDefinition = Boolean(header & 0x40);
      }

      if (isDefinition) {
        offset += 1;
        const architecture = view.getUint8(offset);
        offset += 1;
        const littleEndian = architecture === 0;
        const globalNumber = view.getUint16(offset, littleEndian);
        offset += 2;
        const fieldCount = view.getUint8(offset);
        offset += 1;
        const fields = [];
        for (let i = 0; i < fieldCount; i += 1) {
          fields.push({
            number: view.getUint8(offset),
            size: view.getUint8(offset + 1),
            baseType: view.getUint8(offset + 2)
          });
          offset += 3;
        }

        const developerFields = [];
        if (header & 0x20) {
          const developerFieldCount = view.getUint8(offset);
          offset += 1;
          for (let i = 0; i < developerFieldCount; i += 1) {
            developerFields.push({
              number: view.getUint8(offset),
              size: view.getUint8(offset + 1),
              developerIndex: view.getUint8(offset + 2)
            });
            offset += 3;
          }
        }

        localDefinitions.set(localNumber, {
          architecture,
          developerFields,
          fields,
          globalNumber
        });
        continue;
      }

      const definition = localDefinitions.get(localNumber);
      if (!definition) throw new Error("FIT file references an unknown local message definition.");

      const values = {};
      definition.fields.forEach((field) => {
        values[field.number] = readValue(view, offset, field.size, field.baseType, definition.architecture);
        offset += field.size;
      });
      definition.developerFields.forEach((field) => {
        offset += field.size;
      });

      messages.push({
        globalNumber: definition.globalNumber,
        values
      });
    }

    return messages;
  }

  function parseFitLastSession(buffer, options = {}) {
    const messages = parseFit(buffer);
    const session = messages.find((message) => message.globalNumber === 18)?.values || {};
    const activity = messages.find((message) => message.globalNumber === 34)?.values || {};
    const records = messages.filter((message) => message.globalNumber === 20).map((message) => message.values);
    const sets = messages.filter((message) => message.globalNumber === 225).map((message) => message.values);
    const activeSets = sets.filter((set) => set[5] === 1);
    const restSets = sets.filter((set) => set[5] === 0);
    const heartRates = records.map((record) => record[3]).filter(Number.isFinite);

    const title = displaySport(session);
    const durationSeconds = round((session[8] ?? session[7] ?? activity[0]) / 1000, 0);
    const activeDurationSeconds = round(sum(activeSets.map((set) => set[0] || 0)) / 1000, 0);
    const restDurationSeconds = round(sum(restSets.map((set) => set[0] || 0)) / 1000, 0);
    const totalReps = sum(activeSets.map((set) => set[3] || 0));

    return {
      source: "Garmin FIT",
      date: fitDate(session[2] ?? activity[253]),
      title,
      sport: titleCase(SUB_SPORT_NAMES[session[6]] || SPORT_NAMES[session[5]] || title),
      durationSeconds,
      movingTimeSeconds: durationSeconds,
      elapsedTimeSeconds: round((session[7] ?? activity[0]) / 1000, 0),
      calories: session[11] ?? null,
      avgHr: session[16] ?? round(average(heartRates), 0),
      maxHr: session[17] ?? (heartRates.length ? Math.max(...heartRates) : null),
      aerobicTe: session[24] != null ? round(session[24] / 10, 1) : null,
      activeSets: activeSets.length || null,
      setRecords: sets.length || null,
      totalReps: totalReps || null,
      activeDurationSeconds: activeDurationSeconds || null,
      restDurationSeconds: restDurationSeconds || null,
      notes: `Imported from Garmin FIT${options.fileName ? ` file ${options.fileName}` : ""}.`
    };
  }

  return {
    parseFit,
    parseFitLastSession
  };
});
