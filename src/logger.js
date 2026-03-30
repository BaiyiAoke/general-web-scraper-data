const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

function createLogger(level = 'INFO') {
    const currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.INFO;

    function formatTime() {
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    function log(level, ...args) {
        if (LOG_LEVELS[level] >= currentLevel) {
            const prefix = `[${formatTime()}] [${level}]`;
            if (level === 'ERROR') {
                console.error(prefix, ...args);
            } else if (level === 'WARN') {
                console.warn(prefix, ...args);
            } else {
                console.log(prefix, ...args);
            }
        }
    }

    return {
        debug: (...args) => log('DEBUG', ...args),
        info: (...args) => log('INFO', ...args),
        warn: (...args) => log('WARN', ...args),
        error: (...args) => log('ERROR', ...args),
    };
}

module.exports = { createLogger };
