const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toGB(bytes) {
    return Number(bytes || 0) / 1000000000;
}

function round(value, decimals = 2) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const factor = 10 ** decimals;

    return Math.round(value * factor) / factor;
}

function getGrowthFromHistory(history, days) {

    if (
        !Array.isArray(history) ||
        history.length < 2
    ) {
        return {
            available: false,
            growthGB: null,
            averageDailyGB: null,
            previousGB: null,
            currentGB: null,
            previousCollectedAt: null
        };
    }

    const current =
        history[history.length - 1];

    const currentTime =
        new Date(
            current.collected_at
        ).getTime();

    const targetTime =
        currentTime -
        (days * MS_PER_DAY);

    let previous = null;

    for (
        let i = history.length - 1;
        i >= 0;
        i--
    ) {

        const row =
            history[i];

        const rowTime =
            new Date(
                row.collected_at
            ).getTime();

        if (
            rowTime <= targetTime
        ) {
            previous = row;
            break;
        }
    }

    if (!previous) {
        return {
            available: false,
            growthGB: null,
            averageDailyGB: null,
            previousGB: null,
            currentGB:
                round(
                    toGB(
                        current.used_bytes
                    )
                ),
            previousCollectedAt: null
        };
    }

    const currentGB =
        toGB(
            current.used_bytes
        );

    const previousGB =
        toGB(
            previous.used_bytes
        );

    const growthGB =
        currentGB -
        previousGB;

    const elapsedDays =
        (
            currentTime -
            new Date(
                previous.collected_at
            ).getTime()
        ) / MS_PER_DAY;

    const averageDailyGB =
        elapsedDays > 0
            ? growthGB / elapsedDays
            : null;

    return {
        available: true,

        growthGB:
            round(growthGB),

        averageDailyGB:
            averageDailyGB === null
                ? null
                : round(
                    averageDailyGB,
                    3
                ),

        previousGB:
            round(previousGB),

        currentGB:
            round(currentGB),

        previousCollectedAt:
            previous.collected_at
    };
}


function getDirectoryGrowth(
    directoryHistory
) {

    const grouped =
        new Map();

    for (
        const row
        of directoryHistory
    ) {

        const key =
            row.directory_path;

        if (
            !grouped.has(key)
        ) {
            grouped.set(
                key,
                []
            );
        }

        grouped
            .get(key)
            .push(row);
    }

    const results = [];

    for (
        const [directory, rows]
        of grouped.entries()
    ) {

        if (
            rows.length < 2
        ) {
            continue;
        }

        rows.sort(
            (a, b) =>
                new Date(
                    a.collected_at
                ) -
                new Date(
                    b.collected_at
                )
        );

        const previous =
            rows[0];

        const current =
            rows[rows.length - 1];

        const previousGB =
            toGB(
                previous.used_bytes
            );

        const currentGB =
            toGB(
                current.used_bytes
            );

        const growthGB =
            currentGB -
            previousGB;

        const elapsedDays =
            (
                new Date(
                    current.collected_at
                ).getTime() -
                new Date(
                    previous.collected_at
                ).getTime()
            ) / MS_PER_DAY;

        const averageDailyGB =
            elapsedDays > 0
                ? growthGB / elapsedDays
                : null;

        results.push({

            directory,

            previousGB:
                round(previousGB),

            currentGB:
                round(currentGB),

            growthGB:
                round(growthGB),

            averageDailyGB:
                averageDailyGB === null
                    ? null
                    : round(
                        averageDailyGB,
                        3
                    ),

            previousCollectedAt:
                previous.collected_at,

            currentCollectedAt:
                current.collected_at
        });
    }

    results.sort(
        (a, b) =>
            b.growthGB -
            a.growthGB
    );

    return results;
}


function getPrediction(
    currentGB,
    capacityGB,
    averageDailyGB,
    thresholdPercent
) {

    if (
        !Number.isFinite(currentGB) ||
        !Number.isFinite(capacityGB)
    ) {
        return {
            available: false,
            days: null,
            thresholdPercent,
            thresholdGB: null
        };
    }

    const thresholdGB =
        capacityGB *
        (
            thresholdPercent / 100
        );

    /*
     * If the threshold has already been reached,
     * no growth history is required.
     */
    if (
        currentGB >= thresholdGB
    ) {
        return {
            available: true,
            days: 0,
            thresholdPercent,
            thresholdGB:
                round(thresholdGB)
        };
    }

    /*
     * The threshold is still in the future.
     * Historical growth is required to predict
     * when it will be reached.
     */
    if (
        !Number.isFinite(averageDailyGB) ||
        averageDailyGB <= 0
    ) {
        return {
            available: false,
            days: null,
            thresholdPercent,
            thresholdGB:
                round(thresholdGB)
        };
    }

    const remainingGB =
        thresholdGB -
        currentGB;

    const days =
        remainingGB /
        averageDailyGB;

    return {
        available: true,
        days:
            Math.ceil(days),
        thresholdPercent,
        thresholdGB:
            round(thresholdGB)
    };
}

function getHealthStatus(
    utilization
) {

    const value =
        Number(
            utilization || 0
        );

    if (
        value >= 95
    ) {
        return {
            status: "CRITICAL",
            level: "critical"
        };
    }

    if (
        value >= 90
    ) {
        return {
            status: "WARNING",
            level: "warning"
        };
    }

    if (
        value >= 80
    ) {
        return {
            status: "ATTENTION",
            level: "attention"
        };
    }

    return {
        status: "HEALTHY",
        level: "healthy"
    };
}


module.exports = {

    getGrowthFromHistory,

    getDirectoryGrowth,

    getPrediction,

    getHealthStatus,

    toGB,

    round

};
