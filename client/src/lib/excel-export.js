export async function exportToExcel(data, filename = "export", sheetName = "Sheet1") {
    try {
        // Dynamic import to reduce bundle size
        const ExcelJS = await import("exceljs");
        
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        
        // Add a worksheet
        const worksheet = workbook.addWorksheet(sheetName);

        if (data && data.length > 0) {
            // Add headers
            const headers = Object.keys(data[0]);
            worksheet.addRow(headers);

            // Add data rows
            data.forEach(row => {
                const values = headers.map(header => row[header]);
                worksheet.addRow(values);
            });

            // Style the header row
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
        }

        // Generate Excel file and trigger download
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { 
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${filename}.xlsx`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });

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