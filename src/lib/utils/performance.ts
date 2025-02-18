import { dev } from '$app/environment';

const formatDuration = (start: number, end: number): string => {
    const duration = end - start;
    return `${duration.toFixed(2)}ms`;
};

export const logQueryPerformance = (queryName: string, startTime: number) => {
    if (!dev) return; // Only log in development mode
    
    const endTime = performance.now();
    console.log(`[Query Performance] ${queryName}: ${formatDuration(startTime, endTime)}`);
};

export const measureAsync = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    if (!dev) return fn(); // In production, just run the function without measuring
    
    const startTime = performance.now();
    try {
        const result = await fn();
        const endTime = performance.now();
        console.log(`[Performance] ${name}: ${formatDuration(startTime, endTime)}`);
        return result;
    } catch (error) {
        const endTime = performance.now();
        console.error(`[Performance Error] ${name}: ${formatDuration(startTime, endTime)}`, error);
        throw error;
    }
}; 