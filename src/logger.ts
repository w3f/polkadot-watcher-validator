import { createLogger, Logger as LoggerW3f } from '@w3f/logger';

// export const logger = createLogger() //logger singleton

export class LoggerSingleton {
    private static instance: LoggerW3f
    private constructor() {}
    public static setInstance(level:string): void {
        LoggerSingleton.instance = createLogger(level)
    }
    public static getInstance(level?:string): Logger {
        if (!LoggerSingleton.instance) {
            LoggerSingleton.instance = createLogger(level)
        }        
        return LoggerSingleton.instance
    }
}

export type Logger = LoggerW3f
