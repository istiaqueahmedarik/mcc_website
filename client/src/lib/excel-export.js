import * as XLSX from "xlsx";

export function exportToExcel(data, filename = "export", sheetName = "Sheet1") {
    try {
        // Create a new workbook
        const workbook = XLSX.utils.book_new();

        // Convert data to worksheet
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Generate Excel file and trigger download
        XLSX.writeFile(workbook, `${filename}.xlsx`);

        return true;
    } catch (error) {
        console.error("Error exporting to Excel:", error);
        return false;
    }
}

export function exportToCSV(data, filename = "export") {
    try {
        if (!data || data.length === 0) {
            throw new Error("No data provided");
        }

        // Convert data to CSV string
        const headers = Object.keys(data[0]);
        let csvContent = headers.join(",") + "\n";

        data.forEach((row) => {
            const values = headers.map((header) => {
                let value = row[header];
                if (value === undefined || value === null) {
                    value = "";
                }
                // Handle strings with commas by wrapping in quotes
                if (typeof value === "string" && value.includes(",")) {
                    return `"${value}"`;
                }
                return value;
            });
            csvContent += values.join(",") + "\n";
        });

        // Create a blob and trigger download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return true;
    } catch (error) {
        console.error("Error exporting to CSV:", error);
        return false;
    }
}