import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Asia/Dhaka';

// 1. Get Today's Date in Dhaka Time (YYYY-MM-DD)
// Use for default input values and API queries
export const getDhakaDateISO = () => {
    return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
};

// 2. Format Display Date (e.g. "Sat, 14 Dec")
// Input: "2025-12-14" string from API
export const formatDisplayDate = (dateString) => {
    if (!dateString) return '';

    // Always force Dhaka timezone
    return formatInTimeZone(
        parseISO(dateString),
        TIMEZONE,
        'EEE, d MMM'
    );
};

// 3. Format Time for Display (12h format with AM/PM)
// Input: "16:00:00" string from API
export const formatDisplayTime = (timeString) => {
    if (!timeString) return '';
    // Manual robust parsing
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    const formattedHour = ((h + 11) % 12 + 1);
    return `${formattedHour}:${minutes} ${suffix}`;
};