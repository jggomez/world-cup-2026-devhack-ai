export class TimezoneUtil {
  static STADIUM_OFFSETS = {
    // UTC-6 (México - No DST in Mexico City, Monterrey, Guadalajara)
    'std_azteca': '-06:00',
    'std_bbva': '-06:00',
    'std_akron': '-06:00',
    
    // UTC-7 (PDT - Pacific Daylight Time)
    'std_bc_place': '-07:00',
    'std_sofi': '-07:00',
    'std_levis': '-07:00',
    'std_lumen': '-07:00',
    
    // UTC-5 (CDT - Central Daylight Time)
    'std_att': '-05:00',
    'std_arrowhead': '-05:00',
    'std_nrg': '-05:00',
    
    // UTC-4 (EDT - Eastern Daylight Time)
    'std_bmo': '-04:00',
    'std_metlife': '-04:00',
    'std_mercedes': '-04:00',
    'std_lincoln': '-04:00',
    'std_hard_rock': '-04:00',
    'std_gillette': '-04:00'
  };

  static isMatchPast(date, timeLocal, stadiumId) {
    if (!date || !timeLocal) return false;
    const offset = this.STADIUM_OFFSETS[stadiumId] || '-05:00';
    const isoString = `${date}T${timeLocal}:00${offset}`;
    const matchDate = new Date(isoString);
    if (isNaN(matchDate.getTime())) {
      return false;
    }
    return matchDate.getTime() < Date.now();
  }

  /**
   * Checks if the match is currently live/in-play.
   * A match is live if it started and less than 120 minutes (2 hours) have elapsed.
   */
  static isMatchLive(date, timeLocal, stadiumId) {
    if (!date || !timeLocal) return false;
    const offset = this.STADIUM_OFFSETS[stadiumId] || '-05:00';
    const isoString = `${date}T${timeLocal}:00${offset}`;
    const matchDate = new Date(isoString);
    if (isNaN(matchDate.getTime())) {
      return false;
    }
    const kickoff = matchDate.getTime();
    const now = Date.now();
    return now >= kickoff && (now - kickoff) < 120 * 60 * 1000;
  }

  /**
   * Converts match kickoff from stadium local time to the user's browser local time.
   * Returns a clean string such as "19:00 (GMT-6)" or "19:00 (CST)"
   */
  static getBrowserLocalTime(date, timeLocal, stadiumId) {
    if (!date || !timeLocal) return '';
    
    const offset = this.STADIUM_OFFSETS[stadiumId] || '-05:00';
    const isoString = `${date}T${timeLocal}:00${offset}`;
    const matchDate = new Date(isoString);
    
    if (isNaN(matchDate.getTime())) {
      return timeLocal;
    }

    // Format local hours and minutes in 24h format
    const timeFormatted = matchDate.toLocaleTimeString(navigator.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    // Extract time zone abbreviation
    let tzAbbr = '';
    try {
      const formatter = new Intl.DateTimeFormat(navigator.language, {
        timeZoneName: 'short'
      });
      const parts = formatter.formatToParts(matchDate);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      if (tzPart) {
        tzAbbr = tzPart.value;
      }
    } catch (e) {
      // ignore
    }

    if (!tzAbbr) {
      // Fallback: calculate standard GMT offset
      const offsetMinutes = -matchDate.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const sign = offsetMinutes >= 0 ? '+' : '-';
      tzAbbr = `GMT${sign}${offsetHours}`;
    }

    return `${timeFormatted} (${tzAbbr})`;
  }
}
