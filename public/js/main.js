document.addEventListener('DOMContentLoaded', () => {
    // Set sensible default dates on the Quick Trip Planner form (Tomorrow + 3 days)
    const depInput = document.getElementById('quickDepartureDate');
    const retInput = document.getElementById('quickReturnDate');

    if (depInput && retInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const returnDay = new Date();
        returnDay.setDate(returnDay.getDate() + 4);

        const formatDate = (d) => d.toISOString().split('T')[0];

        if (!depInput.value) depInput.value = formatDate(tomorrow);
        if (!retInput.value) retInput.value = formatDate(returnDay);
        depInput.min = formatDate(new Date());

        depInput.addEventListener('change', () => {
            retInput.min = depInput.value;
            if (retInput.value < depInput.value) {
                retInput.value = depInput.value;
            }
        });
    }
});