'use strict';

const dialCodes = require('../user/phone-dial-codes.enum');

// ISO 3166-1 alpha-2 country codes
const COUNTRY_CODES = [
  'AF', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AG', 'AR', 'AM',
  'AW', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE',
  'BZ', 'BJ', 'BM', 'BT', 'BO', 'BA', 'BW', 'BR', 'IO', 'VG',
  'BN', 'BG', 'BF', 'BI', 'KH', 'CM', 'CA', 'CV', 'KY', 'CF',
  'TD', 'CL', 'CN', 'CO', 'KM', 'CK', 'CR', 'HR', 'CU', 'CW',
  'CY', 'CZ', 'CD', 'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV',
  'GQ', 'ER', 'EE', 'ET', 'FK', 'FO', 'FJ', 'FI', 'FR', 'GF',
  'PF', 'GA', 'GM', 'GE', 'DE', 'GH', 'GI', 'GR', 'GL', 'GD',
  'GP', 'GU', 'GT', 'GN', 'GW', 'GY', 'HT', 'HN', 'HK', 'HU',
  'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT', 'JM', 'JP',
  'JO', 'KZ', 'KE', 'KI', 'XK', 'KW', 'KG', 'LA', 'LV', 'LB',
  'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO', 'MK', 'MG', 'MW',
  'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX',
  'FM', 'MD', 'MC', 'MN', 'ME', 'MS', 'MA', 'MZ', 'MM', 'NA',
  'NR', 'NP', 'NL', 'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF',
  'KP', 'MP', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG', 'PY',
  'PE', 'PH', 'PL', 'PT', 'PR', 'QA', 'CG', 'RO', 'RU', 'RW',
  'SH', 'KN', 'LC', 'PM', 'VC', 'WS', 'SM', 'ST', 'SA', 'SN',
  'RS', 'SC', 'SL', 'SG', 'SX', 'SK', 'SI', 'SB', 'SO', 'ZA',
  'KR', 'SS', 'ES', 'LK', 'SD', 'SR', 'SZ', 'SE', 'CH', 'SY',
  'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TK', 'TO', 'TT', 'TN',
  'TR', 'TM', 'TC', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UY',
  'UZ', 'VU', 'VE', 'VN', 'VI', 'WF', 'YE', 'ZM', 'ZW',
];

module.exports = {
  'geo.countryCodes': COUNTRY_CODES,
  'geo.restrictionTypes': ['WHITE', 'BLACK'],
};
