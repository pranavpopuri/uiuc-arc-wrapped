const facilitiesToTrack = ["Activities & Recreation Center (ARC)", "Campus Recreation Center East (CRCE)"];
let dailyVisits = {};
const tooltip = document.getElementById('tooltip');
const visitColor = '#FF5F05';

// API base URL - Netlify functions
const API_BASE_URL = '/.netlify/functions';

// Helper function for consistent local date formatting
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Function to calculate longest streak for a facility
function calculateLongestStreak(facility) {
    const dates = Object.keys(dailyVisits)
        .filter(date => {
            if (facility === facilitiesToTrack[0]) {
                return dailyVisits[date].ARC > 0;
            } else {
                return dailyVisits[date].CRCE > 0;
            }
        })
        .sort();
    
    if (dates.length === 0) return 0;
    
    let longestStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i-1]);
        const currentDate = new Date(dates[i]);
        
        // Check if dates are consecutive
        const diffTime = currentDate - prevDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }
    
    return longestStreak;
}

// Function to calculate total visits for a facility
function calculateTotalVisits(facility) {
    let total = 0;
    for (const date in dailyVisits) {
        if (facility === facilitiesToTrack[0]) {
            total += dailyVisits[date].ARC;
        } else {
            total += dailyVisits[date].CRCE;
        }
    }
    return total;
}

// File input handler
document.getElementById('fileInput').addEventListener('change', function (e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileStatus = document.getElementById('fileStatus');
    fileStatus.innerHTML = `<span style="color: #13294B;">Processing ${files.length} file(s)...</span>`;
    
    let filesProcessed = 0;
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function (event) {
            parseHTML(event.target.result);
            filesProcessed++;
            
            if (filesProcessed === files.length) {
                updateSummary();
                drawHeatmap();
                fileStatus.innerHTML = `<span style="color: #00a000;">✓ Successfully processed ${files.length} file(s)</span>`;
            }
        };
        reader.readAsText(file);
    });
});

function parseHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const rows = doc.querySelectorAll("#grdFacilitiesAccessInfo tbody tr");

    // Track unique facility-date combinations to avoid duplicates
    const uniqueVisits = new Set();

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (!cells.length) return;
        const facility = cells[0].innerText.trim();
        const dateStr = cells[4].innerText.trim();
        const date = new Date(dateStr);
        if (isNaN(date)) return;

        const key = formatDateLocal(date);
        const visitKey = `${facility}-${key}`;

        if (!uniqueVisits.has(visitKey)) {
            uniqueVisits.add(visitKey);

            if (!dailyVisits[key]) dailyVisits[key] = { ARC: 0, CRCE: 0 };
            
            if (facility === facilitiesToTrack[0] && dailyVisits[key].ARC === 0) {
                dailyVisits[key].ARC = 1;
            }
            if (facility === facilitiesToTrack[1] && dailyVisits[key].CRCE === 0) {
                dailyVisits[key].CRCE = 1;
            }
        }
    });
}

function drawHeatmap() {
    const container = document.getElementById('heatmap');
    container.innerHTML = '';
    const monthLabelsDiv = document.getElementById('monthLabels');
    monthLabelsDiv.innerHTML = '';

    const today = new Date();
    const currentYear = today.getFullYear();
    const startYear = today.getMonth() >= 7 ? currentYear : currentYear - 1;
    const startDate = new Date(startYear, 7, 1);
    const endDate = new Date(startYear + 1, 4, 31);

    const days = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }

    const monthNames = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
    let monthStartIndex = 0;
    monthNames.forEach((month, index) => {
        let i = monthStartIndex;
        while (i < days.length && days[i].getMonth() === (7 + index) % 12) i++;
        const numDays = i - monthStartIndex;
        if (numDays === 0) {
            monthStartIndex = i;
            return;
        }
        const firstWeekday = days[monthStartIndex].getDay();
        const numWeeks = Math.ceil((numDays + firstWeekday) / 7);

        const span = document.createElement('span');
        span.textContent = month;
        span.style.gridColumn = `span ${numWeeks}`;
        monthLabelsDiv.appendChild(span);

        monthStartIndex = i;
    });
    
    monthLabelsDiv.style.visibility = 'visible';

    days.forEach(day => {
        const key = formatDateLocal(day);
        const div = document.createElement('div');
        div.classList.add('day');

        const hasVisit = dailyVisits[key] && (dailyVisits[key].ARC > 0 || dailyVisits[key].CRCE > 0);
        const color = hasVisit ? visitColor : '#ffffff';

        div.style.backgroundColor = color;

        div.addEventListener('mousemove', e => {
            tooltip.style.opacity = 1;
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY + 10 + 'px';
            tooltip.innerText = `${key}: Visit: ${hasVisit ? 'Yes' : 'No'}`;
        });

        div.addEventListener('mouseout', () => tooltip.style.opacity = 0);

        container.appendChild(div);
    });
}

function updateSummary() {
    const tbody = document.querySelector("#summaryTable tbody");
    tbody.innerHTML = '';
    const now = new Date();

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    facilitiesToTrack.forEach(facility => {
        let lastMonthCount = 0;
        let thisMonthCount = 0;

        for (const day in dailyVisits) {
            const visitDate = new Date(day + 'T00:00:00');
            const count = facility === facilitiesToTrack[0] ? dailyVisits[day].ARC : dailyVisits[day].CRCE;

            if (visitDate >= lastMonthStart && visitDate <= lastMonthEnd) {
                lastMonthCount += count;
            }

            if (visitDate >= thisMonthStart && visitDate <= thisMonthEnd) {
                thisMonthCount += count;
            }
        }

        const totalVisits = calculateTotalVisits(facility);
        const longestStreak = calculateLongestStreak(facility);
        
        if (lastMonthCount || thisMonthCount || totalVisits) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${facility}</td>
                            <td>${lastMonthCount}</td>
                            <td>${thisMonthCount}</td>
                            <td>${totalVisits}</td>
                            <td class="${longestStreak >= 5 ? 'streak-high' : ''}">${longestStreak} days</td>`;
            tbody.appendChild(tr);
        }
    });
}

// API functions
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

async function saveToDatabase() {
    const netId = document.getElementById('netIdInput').value.trim();
    const saveStatus = document.getElementById('saveStatus');
    const saveButton = document.getElementById('saveButton');

    if (!netId) {
        saveStatus.innerHTML = '<span style="color: #cc3300;">Please enter your NetID</span>';
        return;
    }

    saveStatus.innerHTML = '<span style="color: #13294B;">Saving...</span>';
    saveButton.disabled = true;
    saveButton.classList.add('loading');

    try {
        // Prepare visit data for saving
        const visitData = {};
        for (const date in dailyVisits) {
            if (dailyVisits[date].ARC > 0 || dailyVisits[date].CRCE > 0) {
                visitData[date] = {
                    ARC: dailyVisits[date].ARC,
                    CRCE: dailyVisits[date].CRCE
                };
            }
        }

        await apiCall('/save-visits', 'POST', {
            netId,
            visits: visitData
        });

        saveStatus.innerHTML = '<span style="color: #00a000;">✓ Data saved successfully!</span>';
    } catch (error) {
        saveStatus.innerHTML = `<span style="color: #cc3300;">Error: ${error.message}</span>`;
    } finally {
        saveButton.disabled = false;
        saveButton.classList.remove('loading');
    }
}

async function loadFromDatabase() {
    const netId = document.getElementById('netIdInput').value.trim();
    const loadStatus = document.getElementById('loadStatus');

    if (!netId) {
        loadStatus.innerHTML = '<span style="color: #cc3300;">Please enter your NetID</span>';
        return;
    }

    loadStatus.innerHTML = '<span style="color: #13294B;">Loading...</span>';

    try {
        const data = await apiCall(`/get-visits?netId=${encodeURIComponent(netId)}`);
        
        if (data.visits) {
            // Merge loaded data with current data
            for (const date in data.visits) {
                if (!dailyVisits[date]) {
                    dailyVisits[date] = { ARC: 0, CRCE: 0 };
                }
                dailyVisits[date].ARC = dailyVisits[date].ARC || data.visits[date].ARC;
                dailyVisits[date].CRCE = dailyVisits[date].CRCE || data.visits[date].CRCE;
            }
            
            drawHeatmap();
            updateSummary();
            loadStatus.innerHTML = '<span style="color: #00a000;">✓ Data loaded successfully!</span>';
        } else {
            loadStatus.innerHTML = '<span style="color: #cc3300;">No data found for this NetID</span>';
        }
    } catch (error) {
        if (error.message.includes('No data found')) {
            loadStatus.innerHTML = '<span style="color: #cc3300;">No data found for this NetID</span>';
        } else {
            loadStatus.innerHTML = `<span style="color: #cc3300;">Error: ${error.message}</span>`;
        }
    }
}
