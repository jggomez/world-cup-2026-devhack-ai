import { TimezoneUtil } from './TimezoneUtil.js';

export class CalendarExporter {
  /**
   * Helper to format a Date object as YYYYMMDDTHHMMSSZ (UTC string)
   */
  static formatToUTCString(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /**
   * Helper to get start and end dates for a match
   */
  static getMatchDates(match) {
    if (!match.date || !match.time_local) return null;
    const offset = TimezoneUtil.STADIUM_OFFSETS[match.stadium_id] || '-05:00';
    const isoString = `${match.date}T${match.time_local}:00${offset}`;
    const startDate = new Date(isoString);
    if (isNaN(startDate.getTime())) return null;
    const endDate = new Date(startDate.getTime() + 120 * 60 * 1000); // 2 hours duration
    return { startDate, endDate };
  }

  /**
   * Generates a Google Calendar direct web URL for a single match
   */
  static generateGoogleCalendarUrl(match) {
    const dates = this.getMatchDates(match);
    if (!dates) return '#';

    const homeName = match.home_team?.name || match.homeTeam || match.home_placeholder || 'TBD';
    const awayName = match.away_team?.name || match.awayTeam || match.away_placeholder || 'TBD';
    const title = `${homeName} vs ${awayName} - FIFA World Cup 2026`;
    
    const startStr = this.formatToUTCString(dates.startDate);
    const endStr = this.formatToUTCString(dates.endDate);
    
    const location = match.stadium_id 
      ? `${match.stadium_id.replace('std_', '').toUpperCase()} Stadium, ${match.city || ''}`
      : match.city || 'Mundial 2026';
      
    const details = `Partido correspondiente al Grupo/Fase de la Copa Mundial de la FIFA 2026. ID de partido: ${match.match_id || match.matchId || ''}.`;
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent(title)}` +
      `&dates=${startStr}/${endStr}` +
      `&details=${encodeURIComponent(details)}` +
      `&location=${encodeURIComponent(location)}`;
  }

  /**
   * Generates and triggers download of an .ics file for a list of matches
   */
  static exportToICS(matches, filename = 'copa-mundial-2026.ics') {
    const validMatches = matches.filter(m => m.date && m.time_local);
    if (validMatches.length === 0) {
      alert('No hay partidos programados para exportar.');
      return;
    }

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Antigravity//World Cup 2026 Schedule//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    const currentUTC = this.formatToUTCString(new Date());

    validMatches.forEach(match => {
      const dates = this.getMatchDates(match);
      if (!dates) return;

      const homeName = match.home_team?.name || match.homeTeam || match.home_placeholder || 'TBD';
      const awayName = match.away_team?.name || match.awayTeam || match.away_placeholder || 'TBD';
      const title = `${homeName} vs ${awayName} - FIFA World Cup 2026`;
      
      const startStr = this.formatToUTCString(dates.startDate);
      const endStr = this.formatToUTCString(dates.endDate);
      const location = match.stadium_id 
        ? `${match.stadium_id.replace('std_', '').toUpperCase()} Stadium, ${match.city || ''}`
        : match.city || 'Mundial 2026';
      const details = `Partido del Mundial 2026. ID del partido: ${match.match_id || match.matchId || ''}.`;

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${(match.match_id || match.matchId || Math.random().toString(36).substring(2))}@worldcup2026.app`);
      icsContent.push(`DTSTAMP:${currentUTC}`);
      icsContent.push(`DTSTART:${startStr}`);
      icsContent.push(`DTEND:${endStr}`);
      icsContent.push(`SUMMARY:${title}`);
      icsContent.push(`DESCRIPTION:${details}`);
      icsContent.push(`LOCATION:${location}`);
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
