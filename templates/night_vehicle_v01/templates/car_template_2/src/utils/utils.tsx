/**
 * nMask must be between -2147483648 and 2147483647
 *
 * Examples:
 * createBinaryString(0) //-> "00000000000000000000000000000000"
 * createBinaryString(123) //-> "00000000000000000000000001111011"
 * createBinaryString(-1) //-> "11111111111111111111111111111111"
 * createBinaryString(-1123456) //-> "11111111111011101101101110000000"
 * createBinaryString(0x7fffffff) //-> "01111111111111111111111111111111"
 */
export function convertIntegerToBinaryString(nMask: number) {
  let sMask = "";
  let nShifted = nMask;

  for (
    let nFlag = 0;
    nFlag < 32;
    nFlag++, sMask += String(nShifted >>> 31), nShifted <<= 1
  );

  return sMask;
}

// for debug collisionFilterGroup
window.createBinaryString = convertIntegerToBinaryString;
// /for debug collisionFilterGroup
