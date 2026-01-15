// Convert numbers to words (Indian Format with Paise)
function numberToWords(amount, currencyCode = "INR") {
  const a = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
    "SEVENTEEN", "EIGHTEEN", "NINETEEN",
  ];

  const b = [
    "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY",
    "SIXTY", "SEVENTY", "EIGHTY", "NINETY",
  ];

  function inWords(num) {
    if (num < 20) return a[num];
    if (num < 100)
      return b[Math.floor(num / 10)] + (num % 10 ? " " + a[num % 10] : "");
    if (num < 1000)
      return a[Math.floor(num / 100)] + " HUNDRED" +
        (num % 100 ? " AND " + inWords(num % 100) : "");
    if (num < 100000)
      return inWords(Math.floor(num / 1000)) + " THOUSAND" +
        (num % 1000 ? " " + inWords(num % 1000) : "");
    if (num < 10000000)
      return inWords(Math.floor(num / 100000)) + " LAKH" +
        (num % 100000 ? " " + inWords(num % 100000) : "");
    return inWords(Math.floor(num / 10000000)) + " CRORE" +
      (num % 10000000 ? " " + inWords(num % 10000000) : "");
  }

  if (!amount || Number(amount) === 0) {
    return currencyCode === "INR"
      ? "ZERO RUPEES ONLY"
      : "ZERO ONLY";
  }

  const value = Number(amount);
  const major = Math.floor(value);
  const minor = Math.round((value - major) * 100);

  // Major & Minor units
  const majorUnit =
    currencyCode === "INR" ? "RUPEES" :
    currencyCode === "USD" ? "DOLLARS" :
    currencyCode === "EUR" ? "EUROS" :
    currencyCode === "GBP" ? "POUNDS" :
    currencyCode === "CNY" ? "YUAN" :
    currencyCode;

  const minorUnit =
    currencyCode === "INR" ? "PAISE" :
    currencyCode === "USD" ? "CENTS" :
    currencyCode === "EUR" ? "CENTS" :
    currencyCode === "GBP" ? "PENCE" :
    currencyCode === "CNY" ? "FEN" :
    "";

  let words = inWords(major) + " " + majorUnit;

  if (minor > 0 && minorUnit) {
    words += " AND " + inWords(minor) + " " + minorUnit;
  }

  return words + " ONLY";
}

module.exports =  numberToWords ;


