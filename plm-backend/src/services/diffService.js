/**
 * diffService — Deep diff engine for comparing two plain objects.
 *
 * Used by BoM diff endpoint and ECO detail review.
 * Computes structural differences and returns DiffEntry[].
 *
 * Internal Mongoose fields (_id, __v, createdAt, updatedAt, isLocked, isDeleted) are ignored.
 */

const IGNORED_FIELDS = new Set([
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'isLocked',
  'isDeleted',
]);

/**
 * Compute the diff between two plain objects.
 *
 * @param {Object} oldDoc - The original document (via .toObject() or .lean())
 * @param {Object} newDoc - The new/modified document
 * @returns {DiffEntry[]} Array of { fieldPath, oldValue, newValue, changeType }
 */
function compute(oldDoc, newDoc) {
  const changes = [];
  diff(oldDoc, newDoc, '', changes);
  return changes;
}

/**
 * Recursive diff function.
 */
function diff(oldObj, newObj, path, changes) {
  const allKeys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {}),
  ]);

  for (const key of allKeys) {
    // Skip internal Mongoose fields
    if (IGNORED_FIELDS.has(key)) continue;

    const currentPath = path ? `${path}.${key}` : key;
    const oldVal = oldObj ? oldObj[key] : undefined;
    const newVal = newObj ? newObj[key] : undefined;

    // Key only in newObj → ADDED
    if (oldVal === undefined && newVal !== undefined) {
      if (isPlainObject(newVal)) {
        flattenAdded(newVal, currentPath, changes);
      } else if (Array.isArray(newVal)) {
        newVal.forEach((item, i) => {
          if (isPlainObject(item)) {
            flattenAdded(item, `${currentPath}[${i}]`, changes);
          } else {
            changes.push({
              fieldPath: `${currentPath}[${i}]`,
              oldValue: undefined,
              newValue: item,
              changeType: 'ADDED',
            });
          }
        });
      } else {
        changes.push({
          fieldPath: currentPath,
          oldValue: undefined,
          newValue: newVal,
          changeType: 'ADDED',
        });
      }
      continue;
    }

    // Key only in oldObj → REMOVED
    if (newVal === undefined && oldVal !== undefined) {
      if (isPlainObject(oldVal)) {
        flattenRemoved(oldVal, currentPath, changes);
      } else if (Array.isArray(oldVal)) {
        oldVal.forEach((item, i) => {
          if (isPlainObject(item)) {
            flattenRemoved(item, `${currentPath}[${i}]`, changes);
          } else {
            changes.push({
              fieldPath: `${currentPath}[${i}]`,
              oldValue: item,
              newValue: undefined,
              changeType: 'REMOVED',
            });
          }
        });
      } else {
        changes.push({
          fieldPath: currentPath,
          oldValue: oldVal,
          newValue: undefined,
          changeType: 'REMOVED',
        });
      }
      continue;
    }

    // Both exist — check for changes
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      diffArrays(oldVal, newVal, currentPath, changes);
    } else if (isPlainObject(oldVal) && isPlainObject(newVal)) {
      diff(oldVal, newVal, currentPath, changes);
    } else if (!isEqual(oldVal, newVal)) {
      changes.push({
        fieldPath: currentPath,
        oldValue: oldVal,
        newValue: newVal,
        changeType: 'UPDATED',
      });
    }
    // If equal → skip (no emission)
  }
}

/**
 * Diff arrays using bracket notation for indices.
 */
function diffArrays(oldArr, newArr, path, changes) {
  const maxLen = Math.max(oldArr.length, newArr.length);

  for (let i = 0; i < maxLen; i++) {
    const indexPath = `${path}[${i}]`;
    const oldItem = i < oldArr.length ? oldArr[i] : undefined;
    const newItem = i < newArr.length ? newArr[i] : undefined;

    if (oldItem === undefined) {
      if (isPlainObject(newItem)) {
        flattenAdded(newItem, indexPath, changes);
      } else {
        changes.push({
          fieldPath: indexPath,
          oldValue: undefined,
          newValue: newItem,
          changeType: 'ADDED',
        });
      }
    } else if (newItem === undefined) {
      if (isPlainObject(oldItem)) {
        flattenRemoved(oldItem, indexPath, changes);
      } else {
        changes.push({
          fieldPath: indexPath,
          oldValue: oldItem,
          newValue: undefined,
          changeType: 'REMOVED',
        });
      }
    } else if (isPlainObject(oldItem) && isPlainObject(newItem)) {
      diff(oldItem, newItem, indexPath, changes);
    } else if (!isEqual(oldItem, newItem)) {
      changes.push({
        fieldPath: indexPath,
        oldValue: oldItem,
        newValue: newItem,
        changeType: 'UPDATED',
      });
    }
  }
}

/**
 * Flatten all fields of an added object into individual ADDED entries.
 */
function flattenAdded(obj, path, changes) {
  for (const key of Object.keys(obj)) {
    if (IGNORED_FIELDS.has(key)) continue;
    const fieldPath = `${path}.${key}`;
    if (isPlainObject(obj[key])) {
      flattenAdded(obj[key], fieldPath, changes);
    } else {
      changes.push({
        fieldPath,
        oldValue: undefined,
        newValue: obj[key],
        changeType: 'ADDED',
      });
    }
  }
}

/**
 * Flatten all fields of a removed object into individual REMOVED entries.
 */
function flattenRemoved(obj, path, changes) {
  for (const key of Object.keys(obj)) {
    if (IGNORED_FIELDS.has(key)) continue;
    const fieldPath = `${path}.${key}`;
    if (isPlainObject(obj[key])) {
      flattenRemoved(obj[key], fieldPath, changes);
    } else {
      changes.push({
        fieldPath,
        oldValue: obj[key],
        newValue: undefined,
        changeType: 'REMOVED',
      });
    }
  }
}

/**
 * Check if a value is a plain object (not array, not null, not Date).
 */
function isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date);
}

/**
 * Deep equality check for primitives and simple objects.
 */
function isEqual(a, b) {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => isEqual(a[key], b[key]));
}

module.exports = { compute };
