import { CalendarUtil } from './CalendarUtil.js';
import { TRANSLATIONS } from '../lang/TranslationDict.js';

let activeTimers = [];

export class NotificationUtil {
  /**
   * Check if Notifications are supported
   */
  static isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Request Notification permissions
   */
  static async requestPermission() {
    if (!this.isSupported()) {
      console.warn("Notifications are not supported in this browser.");
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      localStorage.setItem('match_alerts_permission', permission);
      return permission;
    } catch (err) {
      console.error("Failed to request notification permission:", err);
      return 'default';
    }
  }

  /**
   * Check current stored permission state
   */
  static getStoredPermission() {
    if (!this.isSupported()) return 'denied';
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission;
    }
    return localStorage.getItem('match_alerts_permission') || 'default';
  }

  /**
   * Clear all existing scheduled timers
   */
  static clearAllScheduledAlerts() {
    activeTimers.forEach(timer => clearTimeout(timer));
    activeTimers = [];
  }

  /**
   * Schedule alerts for all matches (10m and 5m before kickoff)
   */
  static scheduleAllAlerts(matches, stadiums = []) {
    if (!this.isSupported() || this.getStoredPermission() !== 'granted') {
      return;
    }

    // Clear any previous timers to avoid duplicates
    this.clearAllScheduledAlerts();

    const currentLang = (typeof document !== 'undefined' && document.documentElement.lang) || 'es';
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.es;

    let scheduledCount = 0;

    matches.forEach(match => {
      // Get exact start date using CalendarUtil helper (which parses timezone stadium offset correctly)
      const dates = CalendarUtil.getMatchDates(match);
      if (!dates) return;

      const kickoffTime = dates.start.getTime();
      const now = Date.now();

      const home = CalendarUtil.getTeamName(match.home_team) || match.home_placeholder || 'TBD';
      const away = CalendarUtil.getTeamName(match.away_team) || match.away_placeholder || 'TBD';

      const stadium = stadiums.find(s => s.id === match.stadium_id) || {};
      const stadiumName = stadium.name || 'Estadio Oficial';
      const city = match.city || stadium.city || 'Sede oficial';

      // 1. Alert 10 minutes before
      const time10m = kickoffTime - 10 * 60 * 1000;
      if (time10m > now) {
        const delay = time10m - now;
        const timer10 = setTimeout(() => {
          this.triggerNotification(
            dict.notif_kickoff_10m,
            dict.notif_body
              .replace('{home}', home)
              .replace('{away}', away)
              .replace('{stadium}', stadiumName)
              .replace('{city}', city)
          );
        }, delay);
        activeTimers.push(timer10);
        scheduledCount++;
      }

      // 2. Alert 5 minutes before
      const time5m = kickoffTime - 5 * 60 * 1000;
      if (time5m > now) {
        const delay = time5m - now;
        const timer5 = setTimeout(() => {
          this.triggerNotification(
            dict.notif_kickoff_5m,
            dict.notif_body
              .replace('{home}', home)
              .replace('{away}', away)
              .replace('{stadium}', stadiumName)
              .replace('{city}', city)
          );
        }, delay);
        activeTimers.push(timer5);
        scheduledCount++;
      }
    });

    console.log(`[NOTIFICATIONS] Successfully scheduled ${scheduledCount} future local alerts.`);
  }

  /**
   * Helper to trigger the browser notification
   */
  static triggerNotification(title, body) {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return;
    }

    try {
      new Notification(title, {
        body: body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚽</text></svg>',
        tag: `wc2026_${Date.now()}`
      });
    } catch (e) {
      console.warn("Main-thread Notification constructor failed, trying service worker...", e);
      // Fallback for some mobile browsers that require service worker registration
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚽</text></svg>'
          });
        });
      }
    }
  }
}
