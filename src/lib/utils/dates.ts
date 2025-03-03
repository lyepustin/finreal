/**
 * Date utility functions for the application
 */

/**
 * Gets the default date range for the current month
 * @returns An object with from and to dates as ISO strings (YYYY-MM-DD)
 */
export function getDefaultMonthDateRange() {
    // Get current date
    const now = new Date();
    
    // First day of current month in local timezone
    const firstDayOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    
    // Last day of current month in local timezone
    const lastDayOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
    
    // Format dates as YYYY-MM-DD
    const firstDayFormatted = firstDayOfMonth.toISOString().split('T')[0];
    const lastDayFormatted = lastDayOfMonth.toISOString().split('T')[0];
    
    return {
        from: firstDayFormatted,
        to: lastDayFormatted
    };
}

/**
 * Gets the last day of a month
 * @param year The year
 * @param month The month (0-11)
 * @returns The last day of the month as a Date object
 */
export function getLastDayOfMonth(year: number, month: number): Date {
    // Create a date for the first day of the next month, then subtract one day
    return new Date(Date.UTC(year, month + 1, 0));
}

/**
 * Formats a date as YYYY-MM-DD
 * @param date The date to format
 * @returns The formatted date string
 */
export function formatDateYYYYMMDD(date: Date): string {
    return date.toISOString().split('T')[0];
} 