"use strict";


/* =========================================================
   GLOBAL STATE
========================================================= */

let usageChart = null;

let currentInstanceId = null;

let currentTimezone =
    localStorage.getItem("fsMonitorTimezone")
    || "Asia/Kolkata";

let refreshTimer = null;


/* =========================================================
   TIMEZONE LIST
========================================================= */

const TIMEZONES = [

    "UTC",

    "Africa/Abidjan",
    "Africa/Accra",
    "Africa/Addis_Ababa",
    "Africa/Algiers",
    "Africa/Cairo",
    "Africa/Casablanca",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Nairobi",
    "Africa/Tunis",

    "America/Anchorage",
    "America/Argentina/Buenos_Aires",
    "America/Bogota",
    "America/Chicago",
    "America/Denver",
    "America/Halifax",
    "America/Havana",
    "America/Los_Angeles",
    "America/Mexico_City",
    "America/New_York",
    "America/Phoenix",
    "America/Santiago",
    "America/Sao_Paulo",
    "America/St_Johns",
    "America/Toronto",
    "America/Vancouver",

    "Asia/Almaty",
    "Asia/Amman",
    "Asia/Baghdad",
    "Asia/Baku",
    "Asia/Bangkok",
    "Asia/Beirut",
    "Asia/Colombo",
    "Asia/Dhaka",
    "Asia/Dubai",
    "Asia/Hong_Kong",
    "Asia/Jakarta",
    "Asia/Jerusalem",
    "Asia/Kabul",
    "Asia/Karachi",
    "Asia/Kathmandu",
    "Asia/Kolkata",
    "Asia/Kuala_Lumpur",
    "Asia/Manila",
    "Asia/Riyadh",
    "Asia/Seoul",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Asia/Taipei",
    "Asia/Tashkent",
    "Asia/Tehran",
    "Asia/Tokyo",
    "Asia/Ulaanbaatar",
    "Asia/Vientiane",
    "Asia/Yangon",

    "Atlantic/Azores",
    "Atlantic/Reykjavik",

    "Australia/Adelaide",
    "Australia/Brisbane",
    "Australia/Darwin",
    "Australia/Hobart",
    "Australia/Melbourne",
    "Australia/Perth",
    "Australia/Sydney",

    "Europe/Amsterdam",
    "Europe/Athens",
    "Europe/Berlin",
    "Europe/Brussels",
    "Europe/Bucharest",
    "Europe/Budapest",
    "Europe/Copenhagen",
    "Europe/Dublin",
    "Europe/Helsinki",
    "Europe/Istanbul",
    "Europe/Lisbon",
    "Europe/London",
    "Europe/Madrid",
    "Europe/Moscow",
    "Europe/Oslo",
    "Europe/Paris",
    "Europe/Prague",
    "Europe/Rome",
    "Europe/Stockholm",
    "Europe/Vienna",
    "Europe/Warsaw",
    "Europe/Zurich",

    "Pacific/Auckland",
    "Pacific/Fiji",
    "Pacific/Guam",
    "Pacific/Honolulu",
    "Pacific/Port_Moresby",

    "Indian/Maldives",
    "Indian/Mauritius",

    "Etc/GMT+12",
    "Etc/GMT+11",
    "Etc/GMT+10",
    "Etc/GMT+9",
    "Etc/GMT+8",
    "Etc/GMT+7",
    "Etc/GMT+6",
    "Etc/GMT+5",
    "Etc/GMT+4",
    "Etc/GMT+3",
    "Etc/GMT+2",
    "Etc/GMT+1",
    "Etc/GMT-1",
    "Etc/GMT-2",
    "Etc/GMT-3",
    "Etc/GMT-4",
    "Etc/GMT-5",
    "Etc/GMT-6",
    "Etc/GMT-7",
    "Etc/GMT-8",
    "Etc/GMT-9",
    "Etc/GMT-10",
    "Etc/GMT-11",
    "Etc/GMT-12"
];


/* =========================================================
   BASIC HELPERS
========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatGB(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "-";
    }

    return number.toFixed(2) + " GB";
}


function formatPercent(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "-";
    }

    return number.toFixed(2) + "%";
}


function formatGrowth(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "-";
    }

    if (number > 0) {
        return "+" + number.toFixed(2) + " GB";
    }

    if (number < 0) {
        return number.toFixed(2) + " GB";
    }

    return "0.00 GB";
}


function formatDays(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "Not enough history";
    }

    if (number === 0) {
        return "Threshold reached";
    }

    if (number === 1) {
        return "1 day";
    }

    return Math.ceil(number) + " days";
}


/* =========================================================
   TIMEZONE HELPERS
========================================================= */

function isValidTimezone(timezone) {

    try {

        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone: timezone
            }
        );

        return true;

    } catch (error) {

        return false;

    }
}


function formatDate(
    value,
    options
) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "-";
    }

    const defaultOptions = {

        timeZone:
            currentTimezone,

        year: "numeric",

        month: "short",

        day: "2-digit",

        hour: "2-digit",

        minute: "2-digit",

        second: "2-digit",

        hour12: true
    };

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            ...defaultOptions,
            ...(options || {})
        }
    ).format(date);
}


function formatChartDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            timeZone:
                currentTimezone,

            day: "2-digit",

            month: "short",

            hour: "2-digit",

            minute: "2-digit",

            hour12: false
        }
    ).format(date);
}


function updateServerTime() {

    const element =
        getElement("serverTime");

    if (!element) {
        return;
    }

    element.textContent =
        formatDate(
            new Date().toISOString()
        );

}


/* =========================================================
   TIMEZONE DROPDOWN
========================================================= */

function populateTimezones() {

    const timezoneSelect =
        getElement("timezoneSelect");

    const timezoneSelectedValue =
        getElement("timezoneSelectedValue");

    const timezoneOptions =
        getElement("timezoneOptions");

    if (
        !timezoneSelect ||
        !timezoneSelectedValue ||
        !timezoneOptions
    ) {
        return;
    }

    timezoneSelect.innerHTML = "";
    timezoneOptions.innerHTML = "";

    TIMEZONES.forEach(
        (timezone) => {

            const option =
                document.createElement("option");

            option.value =
                timezone;

            option.textContent =
                timezone;

            timezoneSelect.appendChild(
                option
            );
        }
    );

    if (
        !isValidTimezone(
            currentTimezone
        )
    ) {

        currentTimezone =
            "Asia/Kolkata";

        localStorage.setItem(
            "fsMonitorTimezone",
            currentTimezone
        );
    }

    timezoneSelect.value =
        currentTimezone;

    timezoneSelectedValue.textContent =
        currentTimezone;

    renderTimezoneOptions();
}

function renderTimezoneOptions() {

    const timezoneOptions =
        getElement("timezoneOptions");

    const timezoneSearch =
        getElement("timezoneSearch");

    const timezoneNoResults =
        getElement("timezoneNoResults");

    if (
        !timezoneOptions ||
        !timezoneSearch ||
        !timezoneNoResults
    ) {
        return;
    }

    const searchTerm =
        timezoneSearch.value
            .trim()
            .toLowerCase();

    const filtered =
        TIMEZONES.filter(
            (timezone) => {

                return timezone
                    .toLowerCase()
                    .includes(searchTerm);

            }
        );

    timezoneOptions.innerHTML = "";

    if (filtered.length === 0) {

        timezoneNoResults.hidden =
            false;

        return;
    }

    timezoneNoResults.hidden =
        true;

    filtered.forEach(
        (timezone) => {

            const option =
                document.createElement("button");

            option.type =
                "button";

            option.className =
                "timezone-option";

            if (
                timezone === currentTimezone
            ) {
                option.classList.add(
                    "selected"
                );
            }

            option.textContent =
                timezone;

            option.setAttribute(
                "role",
                "option"
            );

            option.setAttribute(
                "aria-selected",
                timezone === currentTimezone
                    ? "true"
                    : "false"
            );

            option.addEventListener(
                "click",
                function () {

                    selectTimezone(
                        timezone
                    );

                }
            );

            timezoneOptions.appendChild(
                option
            );
        }
    );
}

function selectTimezone(timezone) {

    if (
        !isValidTimezone(
            timezone
        )
    ) {
        return;
    }

    currentTimezone =
        timezone;

    localStorage.setItem(
        "fsMonitorTimezone",
        currentTimezone
    );

    const timezoneSelect =
        getElement("timezoneSelect");

    const timezoneSelectedValue =
        getElement("timezoneSelectedValue");

    const timezoneSearch =
        getElement("timezoneSearch");

    if (timezoneSelect) {

        timezoneSelect.value =
            currentTimezone;
    }

    if (timezoneSelectedValue) {

        timezoneSelectedValue.textContent =
            currentTimezone;
    }

    if (timezoneSearch) {

        timezoneSearch.value =
            "";
    }

    renderTimezoneOptions();

    closeTimezoneMenu();

    /*
     * Reuse the existing timezone-change
     * logic so Server Time, Last Collection,
     * chart labels and tooltips continue
     * using the selected timezone.
     */
    handleTimezoneChange();
}

function openTimezoneMenu() {

    const timezonePicker =
        getElement("timezonePicker");

    const timezoneMenu =
        getElement("timezoneMenu");

    const timezoneTrigger =
        getElement("timezoneTrigger");

    const timezoneSearch =
        getElement("timezoneSearch");

    if (
        !timezonePicker ||
        !timezoneMenu ||
        !timezoneTrigger
    ) {
        return;
    }

    timezoneMenu.hidden =
        false;

    timezonePicker.classList.add(
        "open"
    );

    timezoneTrigger.setAttribute(
        "aria-expanded",
        "true"
    );

    renderTimezoneOptions();

    if (timezoneSearch) {

        setTimeout(
            function () {

                timezoneSearch.focus();

            },
            0
        );
    }
}


function closeTimezoneMenu() {

    const timezonePicker =
        getElement("timezonePicker");

    const timezoneMenu =
        getElement("timezoneMenu");

    const timezoneTrigger =
        getElement("timezoneTrigger");

    if (
        !timezonePicker ||
        !timezoneMenu ||
        !timezoneTrigger
    ) {
        return;
    }

    timezoneMenu.hidden =
        true;

    timezonePicker.classList.remove(
        "open"
    );

    timezoneTrigger.setAttribute(
        "aria-expanded",
        "false"
    );
}

function setupTimezoneSearch() {

    const timezonePicker =
        getElement("timezonePicker");

    const timezoneTrigger =
        getElement("timezoneTrigger");

    const timezoneSearch =
        getElement("timezoneSearch");

    const timezoneMenu =
        getElement("timezoneMenu");

    if (
        !timezonePicker ||
        !timezoneTrigger ||
        !timezoneSearch ||
        !timezoneMenu
    ) {
        return;
    }

    timezoneTrigger.addEventListener(
        "click",
        function () {

            if (timezoneMenu.hidden) {

                openTimezoneMenu();

            } else {

                closeTimezoneMenu();

            }

        }
    );

    timezoneSearch.addEventListener(
        "input",
        function () {

            renderTimezoneOptions();

        }
    );

    timezoneSearch.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                closeTimezoneMenu();

                timezoneTrigger.focus();

            }

        }
    );

    document.addEventListener(
        "click",
        function (event) {

            if (
                !timezonePicker.contains(
                    event.target
                )
            ) {

                closeTimezoneMenu();

            }

        }
    );

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                closeTimezoneMenu();

            }

        }
    );
}

function handleTimezoneChange() {

    const select =
        getElement("timezoneSelect");

    if (!select) {
        return;
    }

    currentTimezone =
        select.value;

    localStorage.setItem(
        "fsMonitorTimezone",
        currentTimezone
    );

    updateServerTime();

    if (currentInstanceId) {

        loadDashboard(
            currentInstanceId
        );

    }

}


/* =========================================================
   API HELPER
========================================================= */

async function apiFetch(
    url,
    options
) {

    const response =
        await fetch(
            url,
            options || {}
        );

    if (
        response.status === 401
    ) {

        window.location.href =
            "/login.html";

        throw new Error(
            "Authentication required"
        );
    }

    if (!response.ok) {

        let message =
            "Request failed";

        try {

            const body =
                await response.json();

            if (body.error) {
                message =
                    body.error;
            }

        } catch (error) {
            /* Ignore JSON parsing error */
        }

        throw new Error(
            message
        );
    }

    return response.json();

}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        await fetch(
            "/api/auth/logout",
            {
                method: "POST"
            }
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }

    window.location.href =
        "/login.html";

}


/* =========================================================
   LOAD INSTANCES
========================================================= */

async function loadInstances() {

    const select =
        getElement("instanceSelect");

    if (!select) {
        return;
    }

    try {

        const data =
            await apiFetch(
                "/api/instances"
            );

        const instances =
            Array.isArray(data)
                ? data
                : (
                    Array.isArray(
                        data.instances
                    )
                        ? data.instances
                        : []
                );

        select.innerHTML = "";

        if (
            instances.length === 0
        ) {

            const option =
                document.createElement(
                    "option"
                );

            option.value = "";

            option.textContent =
                "No monitoring instances";

            select.appendChild(
                option
            );

            return;
        }

        instances.forEach(
            function (instance) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    instance.id;

                option.textContent =
                    instance.name
                    || instance.instance_id
                    || "Instance " + instance.id;

                select.appendChild(
                    option
                );

            }
        );

        const savedInstance =
            localStorage.getItem(
                "fsMonitorInstance"
            );

        let selectedInstance =
            instances.find(
                function (instance) {

                    return String(
                        instance.id
                    )
                    === String(
                        savedInstance
                    );

                }
            );

        if (!selectedInstance) {

            selectedInstance =
                instances[0];

        }

        currentInstanceId =
            selectedInstance.id;

        select.value =
            String(
                selectedInstance.id
            );

        localStorage.setItem(
            "fsMonitorInstance",
            selectedInstance.id
        );

        await loadDashboard(
            selectedInstance.id
        );

    } catch (error) {

        console.error(
            "Instance loading error:",
            error
        );

        select.innerHTML =
            "<option value=\"\">Unable to load instances</option>";

    }

}


/* =========================================================
   LOAD COMPLETE DASHBOARD
========================================================= */

async function loadDashboard(
    instanceId
) {

    if (!instanceId) {
        return;
    }

    currentInstanceId =
        instanceId;

    localStorage.setItem(
        "fsMonitorInstance",
        instanceId
    );

    try {

        await Promise.all([

            loadSummary(
                instanceId
            ),

            loadHistory(
                instanceId
            ),

            loadDirectories(
                instanceId
            ),

            loadIntelligence(
                instanceId
            )

        ]);

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

    }

}


/* =========================================================
   SUMMARY
========================================================= */

async function loadSummary(
    instanceId
) {

    try {

        const data =
            await apiFetch(
                "/api/instances/"
                + instanceId
                + "/summary"
            );

        const instance =
            data.instance
            || data;

        const current =
            data.current
            || data;

        const instanceElement =
            getElement(
                "instanceValue"
            );

        if (instanceElement) {

            instanceElement.textContent =
                instance.name
                || instance.instance_id
                || "Filesystem Intelligence";

        }

        const capacityElement =
            getElement(
                "capacityValue"
            );

        if (capacityElement) {

            const capacityGB =
                current.capacityGB
                !== undefined
                    ? Number(
                        current.capacityGB
                    )
                    : (
                        current.capacity_gb
                        !== undefined
                            ? Number(
                                current.capacity_gb
                            )
                            : (
                                Number(
                                    current.capacity_bytes
                                    || 0
                                ) / 1000000000
                            )
                    );

            capacityElement.textContent =
                formatGB(
                    capacityGB
                );

        }

        const usedElement =
            getElement(
                "usedValue"
            );

        if (usedElement) {

	const usedGB =
    current.usedGB
    !== undefined
        ? Number(current.usedGB)
        : (
            current.used_gb
            !== undefined
                ? Number(current.used_gb)
                : (
                    Number(
                        current.used_bytes
                        || 0
                    ) / 1000000000
                )
        );

            usedElement.textContent =
                formatGB(
                    usedGB
                );

        }

        const utilizationElement =
            getElement(
                "utilizationValue"
            );

        if (utilizationElement) {

            utilizationElement.textContent =
                formatPercent(
                    current.utilization
                    !== undefined
                        ? current.utilization
                        : current.usage_percent
                );

        }

        const statusElement =
            getElement(
                "agentStatus"
            );

        if (statusElement) {

            const status =
                instance.status
                || data.status
                || "unknown";

            statusElement.textContent =
                status;

            statusElement.className =
                "metric-value";

        }

        const lastCollectionElement =
            getElement(
                "lastCollection"
            );

        const lastCollection =
            data.lastCollection
            || current.collected_at
            || data.collected_at;

        if (
            lastCollectionElement
            && lastCollection
        ) {

            lastCollectionElement.textContent =
                formatDate(
                    lastCollection
                );

        }

    } catch (error) {

        console.error(
            "Summary loading error:",
            error
        );

    }

}


/* =========================================================
   HISTORY / CHART
========================================================= */

async function loadHistory(
    instanceId
) {

    try {

        const data =
            await apiFetch(
                "/api/instances/"
                + instanceId
                + "/history"
            );

        const history =
            Array.isArray(data)
                ? data
                : (
                    Array.isArray(
                        data.history
                    )
                        ? data.history
                        : []
                );

        renderUsageChart(
            history
        );

    } catch (error) {

        console.error(
            "History loading error:",
            error
        );

    }

}


function renderUsageChart(
    history
) {

    const canvas =
        getElement("usageChart");

    if (!canvas) {
        return;
    }

    if (usageChart) {

        usageChart.destroy();

        usageChart =
            null;

    }

    const labels =
        history.map(
            function (row) {

                return row.collected_at;

            }
        );

    const values =
        history.map(
            function (row) {

                if (
                    row.usedGB !== undefined
                ) {

                    return Number(
                        row.usedGB
                    );

                }

                return Number(
                    row.used_bytes
                    || 0
                ) / 1000000000;

            }
        );

    usageChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Used Storage (GB)",

                            data:
                                values,

                            borderWidth: 2,

                            pointRadius: 2,

                            pointHoverRadius: 5,

                            tension: 0.25,

                            fill: true

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        mode: "index",

                        intersect: false

                    },

                    scales: {

                        x: {

                            type: "category",

                            ticks: {

                                autoSkip: true,

                                maxTicksLimit: 10,

                                maxRotation: 0,

                                minRotation: 0,

                                callback:
                                    function (
                                        value
                                    ) {

                                        const raw =
                                            this.getLabelForValue(
                                                value
                                            );

                                        return formatChartDate(
                                            raw
                                        );

                                    }

                            },

                            title: {

                                display: true,

                                text:
                                    "Time ("
                                    + currentTimezone
                                    + ")"

                            }

                        },

                        y: {

                            beginAtZero: true,

                            title: {

                                display: true,

                                text:
                                    "Storage Used (GB)"

                            },

                            ticks: {

                                callback:
                                    function (
                                        value
                                    ) {

                                        return value
                                            + " GB";

                                    }

                            }

                        }

                    },

                    plugins: {

                        legend: {

                            display: true

                        },

                        tooltip: {

                            callbacks: {

                                title:
                                    function (
                                        tooltipItems
                                    ) {

                                        if (
                                            !tooltipItems
                                            || tooltipItems.length === 0
                                        ) {

                                            return "";

                                        }

                                        const index =
                                            tooltipItems[0]
                                                .dataIndex;

                                        const raw =
                                            labels[index];

                                        return formatDate(
                                            raw
                                        );

                                    },

                                label:
                                    function (
                                        context
                                    ) {

                                        const value =
                                            Number(
                                                context.parsed.y
                                            );

                                        return (
                                            "Used Storage: "
                                            + value.toFixed(2)
                                            + " GB"
                                        );

                                    }

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   DIRECTORIES
========================================================= */

async function loadDirectories(
    instanceId
) {

    try {

        const data =
            await apiFetch(
                "/api/instances/"
                + instanceId
                + "/directories"
            );

        const directories =
            Array.isArray(data)
                ? data
                : (
                    Array.isArray(
                        data.directories
                    )
                        ? data.directories
                        : []
                );

        renderDirectories(
            directories
        );

    } catch (error) {

        console.error(
            "Directory loading error:",
            error
        );

    }

}


function renderDirectories(
    directories
) {

    const table =
        getElement(
            "directoryTable"
        );

    if (!table) {
        return;
    }

    const tbody =
        table.querySelector(
            "tbody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";

    if (
        directories.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="2"
                    class="empty-state"
                >
                    No directory data available
                </td>
            </tr>
            `;

        return;
    }

    directories
        .slice(0, 10)
        .forEach(
            function (row) {

                const path =
                    row.directory_path
                    || row.path
                    || row.directory
                    || "-";

		let usedGB =
    row.usedGB;

if (
    usedGB === undefined
) {

    usedGB =
        row.used_gb;

}

if (
    usedGB === undefined
) {

    usedGB =
        row.size_gb;

}

if (
    usedGB === undefined
) {

    usedGB =
        Number(
            row.used_bytes
            || 0
        ) / 1000000000;

}

                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.innerHTML =
                    `
                    <td>
                        ${escapeHtml(path)}
                    </td>

                    <td>
                        ${formatGB(usedGB)}
                    </td>
                    `;

                tbody.appendChild(
                    tr
                );

            }
        );

}


/* =========================================================
   INTELLIGENCE API
========================================================= */

async function loadIntelligence(
    instanceId
) {

    try {

        const data =
            await apiFetch(
                "/api/instances/"
                + instanceId
                + "/intelligence"
            );

        renderIntelligence(
            data
        );

    } catch (error) {

        console.error(
            "Intelligence loading error:",
            error
        );

        renderIntelligenceError();

    }

}


/* =========================================================
   INTELLIGENCE RENDERING
========================================================= */

function renderIntelligence(
    data
) {

    const growth =
        data.growth
        || {};

    const sevenDay =
        growth.sevenDay
        || {};

    const fourteenDay =
        growth.fourteenDay
        || {};

    const averageDaily =
        growth.averageDailyGB;

    const sevenDayElement =
        getElement(
            "sevenDayGrowth"
        );

    const sevenDayDetail =
        getElement(
            "sevenDayGrowthDetail"
        );

    if (sevenDayElement) {

        sevenDayElement.textContent =
            sevenDay.available
                ? formatGrowth(
                    sevenDay.growthGB
                )
                : "Not enough history";

    }

    if (sevenDayDetail) {

        if (
            sevenDay.available
        ) {

            sevenDayDetail.textContent =
                "Previous: "
                + formatGB(
                    sevenDay.previousGB
                )
                + " → Current: "
                + formatGB(
                    sevenDay.currentGB
                );

        } else {

            sevenDayDetail.textContent =
                "Requires at least 7 days of history";

        }

    }


    const fourteenDayElement =
        getElement(
            "fourteenDayGrowth"
        );

    const fourteenDayDetail =
        getElement(
            "fourteenDayGrowthDetail"
        );

    if (fourteenDayElement) {

        fourteenDayElement.textContent =
            fourteenDay.available
                ? formatGrowth(
                    fourteenDay.growthGB
                )
                : "Not enough history";

    }

    if (fourteenDayDetail) {

        if (
            fourteenDay.available
        ) {

            fourteenDayDetail.textContent =
                "Previous: "
                + formatGB(
                    fourteenDay.previousGB
                )
                + " → Current: "
                + formatGB(
                    fourteenDay.currentGB
                );

        } else {

            fourteenDayDetail.textContent =
                "Requires at least 14 days of history";

        }

    }


	const averageElement =
    getElement(
        "averageDailyGrowth"
    );

if (averageElement) {

    const hasAverageDaily =
        averageDaily !== null
        && averageDaily !== undefined
        && Number.isFinite(
            Number(averageDaily)
        );

    averageElement.textContent =
        hasAverageDaily
            ? formatGrowth(
                Number(averageDaily)
            ).replace(
                " GB",
                " GB/day"
            )
            : "Not enough history";

}

    renderFastestGrowing(
        data.fastestGrowing
    );


    renderPredictions(
        data.prediction
    );


    renderHealth(
        data.health
    );


    const lastCollectionElement =
        getElement(
            "lastCollection"
        );

    if (
        lastCollectionElement
        && data.lastCollection
    ) {

        lastCollectionElement.textContent =
            formatDate(
                data.lastCollection
            );

    }


    const instanceValue =
        getElement(
            "instanceValue"
        );

    if (
        instanceValue
        && data.instance
    ) {

        instanceValue.textContent =
            data.instance.name
            || data.instance.instance_id
            || "Filesystem Intelligence";

    }


    const agentStatus =
        getElement(
            "agentStatus"
        );

    if (
        agentStatus
        && data.instance
    ) {

        agentStatus.textContent =
            data.instance.status
            || "unknown";

    }

}


/* =========================================================
   FASTEST GROWING
========================================================= */

function renderFastestGrowing(
    item
) {

    const directoryElement =
        getElement(
            "fastestGrowingDirectory"
        );

    const previousElement =
        getElement(
            "fastestGrowingPrevious"
        );

    const currentElement =
        getElement(
            "fastestGrowingCurrent"
        );

    const growthElement =
        getElement(
            "fastestGrowingGrowth"
        );


    if (!item) {

        if (directoryElement) {
            directoryElement.textContent =
                "Not enough history";
        }

        if (previousElement) {
            previousElement.textContent =
                "-";
        }

        if (currentElement) {
            currentElement.textContent =
                "-";
        }

        if (growthElement) {
            growthElement.textContent =
                "-";
        }

        return;

    }


    if (directoryElement) {

        directoryElement.textContent =
            item.directory
            || "-";

    }


    if (previousElement) {

        previousElement.textContent =
            formatGB(
                item.previousGB
            );

    }


    if (currentElement) {

        currentElement.textContent =
            formatGB(
                item.currentGB
            );

    }


    if (growthElement) {

        growthElement.textContent =
            formatGrowth(
                item.growthGB
            );

    }

}


/* =========================================================
   PREDICTIONS
========================================================= */

function renderPredictionValue(
    prediction
) {

    if (
        !prediction
        || !prediction.available
    ) {

        return "Not enough history";

    }

    return formatDays(
        prediction.days
    );

}


function renderPredictions(
    prediction
) {

    const prediction80 =
        getElement(
            "prediction80"
        );

    const prediction90 =
        getElement(
            "prediction90"
        );

    const prediction95 =
        getElement(
            "prediction95"
        );


    if (prediction80) {

        prediction80.textContent =
            renderPredictionValue(
                prediction
                    ? prediction.eightyPercent
                    : null
            );

    }


    if (prediction90) {

        prediction90.textContent =
            renderPredictionValue(
                prediction
                    ? prediction.ninetyPercent
                    : null
            );

    }


    if (prediction95) {

        prediction95.textContent =
            renderPredictionValue(
                prediction
                    ? prediction.ninetyFivePercent
                    : null
            );

    }

}


/* =========================================================
   HEALTH
========================================================= */

function renderHealth(
    health
) {

    const statusElement =
        getElement(
            "healthStatus"
        );

    const descriptionElement =
        getElement(
            "healthDescription"
        );

    const badgeElement =
        getElement(
            "healthBadge"
        );


    const status =
        health
        && health.status
            ? health.status
            : "UNKNOWN";

    const level =
        health
        && health.level
            ? health.level
            : "unknown";


    if (statusElement) {

        statusElement.textContent =
            status;

    }


    if (descriptionElement) {

        if (
            level === "healthy"
        ) {

            descriptionElement.textContent =
                "Filesystem utilization is below the attention threshold.";

        } else if (
            level === "attention"
        ) {

            descriptionElement.textContent =
                "Filesystem utilization has reached the attention threshold.";

        } else if (
            level === "warning"
        ) {

            descriptionElement.textContent =
                "Filesystem utilization has reached the warning threshold.";

        } else if (
            level === "critical"
        ) {

            descriptionElement.textContent =
                "Filesystem utilization has reached the critical threshold.";

        } else {

            descriptionElement.textContent =
                "Filesystem health data is unavailable.";

        }

    }


    if (badgeElement) {

        badgeElement.textContent =
            status;

        badgeElement.className =
            "status-pill";

        if (
            level === "healthy"
        ) {

            badgeElement.classList.add(
                "status-online"
            );

        } else if (
            level === "warning"
            || level === "critical"
        ) {

            badgeElement.classList.add(
                "status-offline"
            );

        } else {

            badgeElement.classList.add(
                "status-unknown"
            );

        }

    }

}


/* =========================================================
   INTELLIGENCE ERROR
========================================================= */

function renderIntelligenceError() {

    const fields = [

        "sevenDayGrowth",
        "fourteenDayGrowth",
        "averageDailyGrowth",
        "prediction80",
        "prediction90",
        "prediction95"

    ];

    fields.forEach(
        function (id) {

            const element =
                getElement(id);

            if (element) {

                element.textContent =
                    "Unavailable";

            }

        }
    );


    renderFastestGrowing(
        null
    );


    renderHealth(
        {
            status: "UNKNOWN",
            level: "unknown"
        }
    );

}


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    const instanceSelect =
        getElement(
            "instanceSelect"
        );

    if (instanceSelect) {

        instanceSelect.addEventListener(
            "change",
            function () {

                const instanceId =
                    this.value;

                if (!instanceId) {
                    return;
                }

                currentInstanceId =
                    instanceId;

                localStorage.setItem(
                    "fsMonitorInstance",
                    instanceId
                );

                loadDashboard(
                    instanceId
                );

            }
        );

    }


    const timezoneSelect =
        getElement(
            "timezoneSelect"
        );

    if (timezoneSelect) {

        timezoneSelect.addEventListener(
            "change",
            handleTimezoneChange
        );

    }


    const logoutButton =
        getElement(
            "logoutButton"
        );

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );

    }

}


/* =========================================================
   AUTO REFRESH
========================================================= */

function startAutoRefresh() {

    if (refreshTimer) {

        clearInterval(
            refreshTimer
        );

    }

    refreshTimer =
        setInterval(
            function () {

                if (
                    currentInstanceId
                ) {

                    loadDashboard(
                        currentInstanceId
                    );

                }

            },
            10000
        );

}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        populateTimezones();

        setupTimezoneSearch();

        setupEvents();

        updateServerTime();

        setInterval(
            updateServerTime,
            1000
        );

        await loadInstances();

        startAutoRefresh();

    }
);
