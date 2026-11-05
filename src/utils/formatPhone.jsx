import { COUNTRY_CODE } from '../constants/auth';

const BULLET = '•';

/** Hide the middle digits on the code screen so the full number is not shown. */
export function maskMobileNumber(mobileNumber, countryCode = COUNTRY_CODE) {
  const digits = String(mobileNumber ?? '').replace(/\D/g, '');

  if (!digits) {
    return countryCode;
  }

  if (digits.length <= 6) {
    return `${countryCode} ${digits}`;
  }

  const visibleStart = digits.slice(0, 2);
  const visibleEnd = digits.slice(-4);
  const maskedCount = digits.length - visibleStart.length - visibleEnd.length;

  return `${countryCode} ${visibleStart}${BULLET.repeat(maskedCount)}${visibleEnd}`;
}
