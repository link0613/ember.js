export default function normalizeClass(params, hash) {
  var value = params[0];

  if (typeof value === 'string') {
    return value;
  } else if (!!value) {
    return hash.activeClass;
  } else {
    return hash.inactiveClass;
  }
}
