import { CalendarUtil } from '../../src/infrastructure/utils/CalendarUtil.js';

function testNotificationTiming() {
  console.log("Testing notification timing offset calculations...");
  const mockMatch = {
    match_id: "test_match",
    match_number: 99,
    date: "2026-07-15",
    time_local: "15:00",
    stadium_id: "std_mercedes" // Atlanta DST offset is -04:00 in July
  };

  const dates = CalendarUtil.getMatchDates(mockMatch);
  if (!dates) {
    throw new Error("Failed to get match dates from CalendarUtil!");
  }

  // Atlanta DST offset is -04:00, so kickoff time in UTC is:
  // 2026-07-15T15:00:00-04:00 => 2026-07-15T19:00:00Z
  const expectedKickoffUTC = "2026-07-15T19:00:00.000Z";
  if (dates.start.toISOString() !== expectedKickoffUTC) {
    throw new Error(`Kickoff date-time calculation mismatch: expected ${expectedKickoffUTC}, got ${dates.start.toISOString()}`);
  }

  const kickoffTime = dates.start.getTime();

  // 10 minutes alert target
  const alert10mTime = kickoffTime - 10 * 60 * 1000;
  const expected10mUTC = "2026-07-15T18:50:00.000Z";
  if (new Date(alert10mTime).toISOString() !== expected10mUTC) {
    throw new Error(`10 minutes alert calculation mismatch: expected ${expected10mUTC}, got ${new Date(alert10mTime).toISOString()}`);
  }

  // 5 minutes alert target
  const alert5mTime = kickoffTime - 5 * 60 * 1000;
  const expected5mUTC = "2026-07-15T18:55:00.000Z";
  if (new Date(alert5mTime).toISOString() !== expected5mUTC) {
    throw new Error(`5 minutes alert calculation mismatch: expected ${expected5mUTC}, got ${new Date(alert5mTime).toISOString()}`);
  }

  console.log("Kickoff UTC:", dates.start.toISOString());
  console.log("10 Min Alert UTC:", new Date(alert10mTime).toISOString());
  console.log("5 Min Alert UTC:", new Date(alert5mTime).toISOString());
  console.log("✅ Notification offset calculation tests passed successfully!");
}

testNotificationTiming();
