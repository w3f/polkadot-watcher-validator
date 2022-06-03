import { createLogger, Logger as LoggerW3f } from '@w3f/logger';

export class LoggerSingleton {
    private static instance: LoggerW3f
    private constructor() {
        //do nothing
    }
    public static setInstance(level: string): void {
        LoggerSingleton.instance = createLogger(level)
    }
    public static getInstance(level?: string): Logger {
        if (!LoggerSingleton.instance) {
            LoggerSingleton.instance = createLogger(level)
        }        
        return LoggerSingleton.instance
    }
}

export type Logger = LoggerW3f
