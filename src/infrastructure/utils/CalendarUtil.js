import { TimezoneUtil } from './TimezoneUtil.js';

export class CalendarUtil {
  /**
   * Helper to extract the team name/string
   */
  static getTeamName(teamField) {
    if (!teamField) return '';
    if (typeof teamField === 'object') {
      return teamField.name || teamField.code || '';
    }
    return teamField;
  }

  /**
   * Helper to format Date objects as YYYYMMDDTHHMMSSZ
   */
  static toUTCString(dateObj) {
    return dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /**
   * Helper to parse local time and local date with a stadium offset into a UTC Date object
   */
  static getMatchDates(match) {
    if (!match.date || !match.time_local) return null;
    const offset = TimezoneUtil.STADIUM_OFFSETS[match.stadium_id] || '-05:00';
    const isoString = `${match.date}T${match.time_local}:00${offset}`;
    const start = new Date(isoString);
    if (isNaN(start.getTime())) return null;
    // Duration: 2 hours (120 minutes)
    const end = new Date(start.getTime() + 120 * 60 * 1000);
    return { start, end };
  }

  /**
   * Helper to get a friendly match identifier string
   */
  static getMatchNumberStr(match) {
    if (match.match_number) return `P#${match.match_number}`;
    if (match.match_id) {
      const parts = match.match_id.split('_');
      if (parts.length === 3) {
        const grp = parts[1].replace('g', 'G');
        const num = parseInt(parts[2].replace('m', ''), 10);
        return `${grp}-P${num}`;
      }
      return match.match_id.toUpperCase();
    }
    return 'TBD';
  }

  /**
   * Generates a Google Calendar add-event link
   */
  static generateGoogleCalendarLink(match, stadiums = []) {
    const dates = this.getMatchDates(match);
    if (!dates) return '';

    const startStr = this.toUTCString(dates.start);
    const endStr = this.toUTCString(dates.end);

    const home = this.getTeamName(match.home_team) || match.home_placeholder || 'TBD';
    const away = this.getTeamName(match.away_team) || match.away_placeholder || 'TBD';
    
    // Find stadium info
    const stadium = stadiums.find(s => s.id === match.stadium_id) || {};
    const stadiumName = stadium.name || 'Estadio Oficial';
    const city = match.city || stadium.city || 'Sede oficial';
    const country = stadium.country || '';
    const location = `${stadiumName}, ${city}${country ? ', ' + country : ''}`;

    const matchNumStr = this.getMatchNumberStr(match);
    const title = `🏆 Copa Mundial 2026: ${home} vs ${away} (${matchNumStr})`;
    const details = `${match.description || ''}\nFase: ${match.stage || 'Eliminatorias'} / Partido: ${matchNumStr}\n\nGenerado por World Cup App.`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  }

  /**
   * Generates standard iCalendar (.ics) string for a list of matches
   */
  static generateICSContent(matches, stadiums = []) {
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//DevHack//World Cup 2026//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    matches.forEach(match => {
      const dates = this.getMatchDates(match);
      if (!dates) return;

      const startStr = this.toUTCString(dates.start);
      const endStr = this.toUTCString(dates.end);
      const stampStr = this.toUTCString(new Date());

      const home = this.getTeamName(match.home_team) || match.home_placeholder || 'TBD';
      const away = this.getTeamName(match.away_team) || match.away_placeholder || 'TBD';

      const stadium = stadiums.find(s => s.id === match.stadium_id) || {};
      const stadiumName = stadium.name || 'Estadio Oficial';
      const city = match.city || stadium.city || 'Sede oficial';
      const country = stadium.country || '';
      const location = `${stadiumName}, ${city}${country ? ', ' + country : ''}`;

      const matchNumStr = this.getMatchNumberStr(match);
      const title = `🏆 Copa Mundial 2026: ${home} vs ${away} (${matchNumStr})`;
      const details = `${match.description || ''}\\nFase: ${match.stage || 'Eliminatorias'} / Partido: ${matchNumStr}\\n\\nGenerado por World Cup App.`;

      ics.push('BEGIN:VEVENT');
      ics.push(`UID:match_${match.match_id || match.match_number}@worldcup2026`);
      ics.push(`DTSTAMP:${stampStr}`);
      ics.push(`DTSTART:${startStr}`);
      ics.push(`DTEND:${endStr}`);
      ics.push(`SUMMARY:${title}`);
      ics.push(`LOCATION:${location}`);
      ics.push(`DESCRIPTION:${details}`);
      ics.push('STATUS:CONFIRMED');
      ics.push('SEQUENCE:0');
      ics.push('END:VEVENT');
    });

    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
  }

  /**
   * Helper to trigger a file download in the browser
   */
  static downloadFile(filename, content, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports a single match to .ics file
   */
  static exportToICS(match, stadiums = []) {
    const content = this.generateICSContent([match], stadiums);
    const filename = `partido_${match.match_number || match.match_id}_${match.home_placeholder || 'home'}_vs_${match.away_placeholder || 'away'}.ics`;
    this.downloadFile(filename, content, 'text/calendar;charset=utf-8');
  }

  /**
   * Exports all matches to a single .ics file
   */
  static exportAllToICS(matches, stadiums = []) {
    const content = this.generateICSContent(matches, stadiums);
    this.downloadFile('calendario_mundial_2026.ics', content, 'text/calendar;charset=utf-8');
  }
}
