const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const generateOverallReportPDF = async (req, res) => {
    try {
        // const { reportData } = req.body; // Get data from request body

        // if (!reportData || !Array.isArray(reportData)) {
        //     return res.status(400).json({ error: 'Invalid data format. Expecting an array of objects.' });
        // }
        
        // Ensure uploads directory exists
        const uploadDir = path.join(__dirname, "../uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const reportData = [
            { state: "Haryana", fieldTeam: 1, headOffice: 0, fota: 0, notAssigned: 253, assigned: 302, visited: 108, rejectVerify: 2, rejectField: 20, rejectHO: 3 },
            { state: "Maharashtra", fieldTeam: 0, headOffice: 0, fota: 0, notAssigned: 25, assigned: 10, visited: 41, rejectVerify: 0, rejectField: 3, rejectHO: 1 },
            { state: "Chhattisgarh", fieldTeam: 0, headOffice: 0, fota: 0, notAssigned: 38, assigned: 65, visited: 2, rejectVerify: 0, rejectField: 0, rejectHO: 0 },
            { state: "Rajasthan", fieldTeam: 0, headOffice: 0, fota: 0, notAssigned: 13, assigned: 11, visited: 2, rejectVerify: 0, rejectField: 0, rejectHO: 0 },
            { state: "Punjab", fieldTeam: 0, headOffice: 0, fota: 0, notAssigned: 12, assigned: 3, visited: 5, rejectVerify: 0, rejectField: 1, rejectHO: 0 },
            { state: "Madhya Pradesh", fieldTeam: 0, headOffice: 0, fota: 0, notAssigned: 0, assigned: 0, visited: 0, rejectVerify: 0, rejectField: 0, rejectHO: 0 }
        ];

        const totals = reportData.reduce((acc, row) => {
            Object.keys(row).forEach((key) => {
                if (key !== "state") {
                    acc[key] = (acc[key] || 0) + row[key];
                }
            });
            return acc;
        }, { state: "Total" });

        reportData.push(totals);

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Generate Table Rows Dynamically
        let tableRows = reportData.map(row => `
            <tr ${row.state === "Total" ? 'style="background-color: #d98c8c; font-weight: bold; color: black;"' : ""}>
                <td>${row.state}</td>
                <td>${row.fieldTeam}</td>
                <td>${row.headOffice}</td>
                <td>${row.fota}</td>
                <td>${row.notAssigned}</td>
                <td>${row.assigned}</td>
                <td>${row.visited}</td>
                <td>${row.rejectVerify}</td>
                <td>${row.rejectField}</td>
                <td>${row.rejectHO}</td>
            </tr>
        `).join('');

        // HTML Content with Styling
        const htmlContent = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h2 { text-align: center;  color: #333; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 2px solid black; padding: 10px; text-align: center; }
                    th { background-color:rgb(223, 120, 120); color: black; }
                    .resolved { background-color: light-yellow; font-weight: bold; }
                    .not-rectified { background-color: lightblue; font-weight: bold; }
                    .misuse { background-color: yellow; font-weight: bold; }
                    .footer { margin-top: 20px; text-align: center; font-size: 14px; }
                </style>
            </head>
            <body>
                <h2>Overall Report</h2>
                <table>
                    <tr>
                        <th rowspan="2">State</th>
                        <th class="resolved" colspan="3">Rectified But Not Verified</th>
                        <th class="not-rectified" colspan="4">Not Rectified</th>
                        <th class="misuse" colspan="2">Misuse</th>
                    </tr>
                    <tr>
                        <th class="resolved">Solved by Field Team</th>
                        <th class="resolved">Solved by Head Office Team</th>
                        <th class="resolved">Solved by Fota</th>
                        <th class="not-rectified">Not Assigned</th>
                        <th class="not-rectified">Assigned</th>
                        <th class="not-rectified">Visited but not rectified</th>
                        <th class="not-rectified">Reject by Verify Team</th>
                        <th class="misuse">Rejected by Field Team</th>
                        <th class="misuse">Reject by Head Office Team</th>
                    </tr>
                    ${tableRows}
                </table>
                <div class="footer">Generated on ${new Date().toLocaleDateString()}</div>
            </body>
            </html>
        `;

        // Load HTML into Puppeteer
        await page.setContent(htmlContent);

        // Set PDF Path
        const pdfFileName = `OverallReport.pdf`;
        const pdfPath = path.join(uploadDir, pdfFileName);
        console.log(pdfPath);

        // Generate PDF in Landscape Mode
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            landscape: true, // Landscape format
            printBackground: true // Colors & Background enabled
        });

        await browser.close();

        // Send PDF as response
        // res.download(pdfPath, 'OverallReport.pdf', (err) => {
        //     if (err) {
        //         console.error('Error sending PDF:', err);
        //         res.status(500).json({ error: 'Error sending the PDF' });
        //     }
        //     // Delete the file after sending
        //     fs.unlinkSync(pdfPath);
        // });
        res.json({ message: "PDF saved successfully!", fileName: pdfFileName });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const generateDailyReportPDF = async (req, res) => {
    try {
        // const reportData = req.body.data; // Get dynamic data from request body

        // if (!reportData || !Array.isArray(reportData)) {
        //     return res.status(400).json({ error: "Invalid data format. Expected an array." });
        // }

        const uploadsDir = path.join(__dirname, "../uploads");
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const reportData = [
            { state: "Haryana", todayComplaints: 28, solvedByFieldTeam: 20, solvedByHeadOfficeTeam: 0, solvedByFota: 0, rejectedByFieldTeam: 2, rejectedByHeadOfficeTeam: 0, assigned: 41, visitedNotRectified: 7, rejectedByVerifyTeam: 2, resolveByVerifyTeam: 21, notRectified: 665, rectifiedNotVerified: 1, misuse: 23 },
            { state: "Maharashtra", todayComplaints: 2, solvedByFieldTeam: 1, solvedByHeadOfficeTeam: 0, solvedByFota: 0, rejectedByFieldTeam: 0, rejectedByHeadOfficeTeam: 0, assigned: 3, visitedNotRectified: 1, rejectedByVerifyTeam: 0, resolveByVerifyTeam: 1, notRectified: 76, rectifiedNotVerified: 0, misuse: 4 },
            { state: "Chhattisgarh", todayComplaints: 2, solvedByFieldTeam: 0, solvedByHeadOfficeTeam: 0, solvedByFota: 0, rejectedByFieldTeam: 0, rejectedByHeadOfficeTeam: 0, assigned: 4, visitedNotRectified: 2, rejectedByVerifyTeam: 0, resolveByVerifyTeam: 0, notRectified: 105, rectifiedNotVerified: 0, misuse: 0 },
            { state: "Rajasthan", todayComplaints: 1, solvedByFieldTeam: 0, solvedByHeadOfficeTeam: 0, solvedByFota: 0, rejectedByFieldTeam: 0, rejectedByHeadOfficeTeam: 0, assigned: 2, visitedNotRectified: 1, rejectedByVerifyTeam: 0, resolveByVerifyTeam: 0, notRectified: 26, rectifiedNotVerified: 0, misuse: 0 },
            { state: "Punjab", todayComplaints: 0, solvedByFieldTeam: 0, solvedByHeadOfficeTeam: 0, solvedByFota: 0, rejectedByFieldTeam: 0, rejectedByHeadOfficeTeam: 0, assigned: 4, visitedNotRectified: 0, rejectedByVerifyTeam: 0, resolveByVerifyTeam: 2, notRectified: 20, rectifiedNotVerified: 0, misuse: 0 },
            { state: "Madhya Pradesh", todayComplaints: 0, solvedByFieldTeam: 0, solvedByHeadOfficeTeam: 0, solvedByFota: 0, rejectedByFieldTeam: 0, rejectedByHeadOfficeTeam: 0, assigned: 0, visitedNotRectified: 0, rejectedByVerifyTeam: 0, resolveByVerifyTeam: 0, notRectified: 0, rectifiedNotVerified: 0, misuse: 0 }
        ];

        // Calculate totals dynamically
        const totals = reportData.reduce((acc, row) => {
            Object.keys(row).forEach((key) => {
                if (key !== "state") {
                    acc[key] = (acc[key] || 0) + row[key];
                }
            });
            return acc;
        }, { state: "Total" });

        reportData.push(totals);

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Generate HTML content dynamically
        let htmlContent = `
        <html>
        <head>
            <style>
                body {
                    text-align: center;
                }
                table {
                    width: 96%;
                    border-collapse: collapse;
                    font-family: Arial, sans-serif;
                    margin: auto; /* Centers the table */
                }
                th, td {
                    border: 2px solid black;
                    padding: 8px;
                    text-align: center;
                }
                th {
                    background-color: #d98c8c;
                    color: black;
                }
                td {
                    background-color: white;
                }
                h2 {
                    text-align: center;
                    color: #333;
                    font-weight: bold;
                }
                .footer {
                    margin-top: 20px;
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                }
        </style>
        </head>
        <body>
            <h2>Daily Report</h2>
            <table>
                <tr>
                    <th>State</th>
                    <th>Today Complaints</th>
                    <th>Solved By Field Team</th>
                    <th>Solved By Head Office Team</th>
                    <th>Solved By Fota</th>
                    <th>Rejected By Field Team</th>
                    <th>Rejected By Head Office Team</th>
                    <th>Assigned</th>
                    <th>Visited but not rectified</th>
                    <th>Rejected by verify team</th>
                    <th>Resolve by verify team</th>
                    <th>Not Rectified</th>
                    <th>Rectified but not Verified</th>
                    <th>Misuse</th>
                </tr>`;

        // Add table rows dynamically
        reportData.forEach((row) => {
            htmlContent += `
                <tr ${row.state === "Total" ? 'style="background-color: #d98c8c; font-weight: bold; color: black;"' : ""}>
                    <td>${row.state}</td>
                    <td style="background-color: yellow">${row.todayComplaints}</td>
                    <td style="background-color: yellow">${row.solvedByFieldTeam}</td>
                    <td>${row.solvedByHeadOfficeTeam}</td>
                    <td>${row.solvedByFota}</td>
                    <td>${row.rejectedByFieldTeam}</td>
                    <td>${row.rejectedByHeadOfficeTeam}</td>
                    <td>${row.assigned}</td>
                    <td>${row.visitedNotRectified}</td>
                    <td>${row.rejectedByVerifyTeam}</td>
                    <td>${row.resolveByVerifyTeam}</td>
                    <td style="background-color: yellow">${row.notRectified}</td>
                    <td style="background-color: yellow">${row.rectifiedNotVerified}</td>
                    <td style="background-color: yellow">${row.misuse}</td>
                </tr>`;
        });

        htmlContent += `
            </table>
            <div class="footer">Generated on ${new Date().toLocaleDateString()}</div>
        </body>
        </html>`;

        // Set the content in Puppeteer
        await page.setContent(htmlContent, { waitUntil: "load" });

        // Define PDF save location
        const pdfFileName = `DailyReport.pdf`;
        const pdfPath = path.join(uploadsDir, pdfFileName);

        // Generate PDF
        await page.pdf({
            path: pdfPath,
            format: "A3",
            landscape: true,
            printBackground: true,
        });

        await browser.close();

        // Send response with saved file path (without download option)
        res.json({ message: "PDF generated successfully!", fileName: pdfFileName });

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const generateDistanceReportPDF = async (req, res) => {
    try{
        // const { reportData } = req.body; // Get data from request body

        // if (!reportData || !Array.isArray(reportData)) {
        //     return res.status(400).json({ error: 'Invalid data format. Expecting an array of objects.' });
        // }

        const uploadsDir = path.join(__dirname, "../uploads");
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const data = [
            {
              "distance": 12.3,
              "farmerName": "John Doe",
              "saralId": "SARAL12345",
              "createdAt": "2023-04-15T08:30:45.123Z",
              "updatedAt": "2024-02-21T10:30:00.567Z",
              "updatedBy": "Jane Smith",
              "department": "Agriculture",
              "complaintDetails": "Pump malfunctioning due to power issues."
            },
            {
              "distance": 34.5,
              "farmerName": "Alice Brown",
              "saralId": "SARAL67890",
              "createdAt": "2023-06-10T14:15:30.890Z",
              "updatedAt": "2024-02-20T16:45:12.345Z",
              "updatedBy": "Robert Wilson",
              "department": "Irrigation",
              "complaintDetails": "Solar panel not charging properly."
            }
        ];
    
        // Generate HTML content dynamically
        const htmlContent = `
            <html>
                <head>
                <style>
                    body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    }
                    h2 {
                    text-align: center;
                    color: #333;
                    }
                    table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    }
                    th, td {
                    border: 2px solid black;
                    padding: 8px;
                    text-align: center;
                    }
                    th {
                    background-color: yellow;
                    color: black;
                    }
                    .footer {
                    margin-top: 20px;
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                    }
                </style>
                </head>
                <body>
                <h2>Distance Report</h2>
                <table>
                    <tr>
                    <th>Distance</th>
                    <th>Farmer Name</th>
                    <th>Saral ID</th>
                    <th>Registration Date</th>
                    <th>Resolve Date</th>
                    <th>District</th>
                    <th>Resolve By</th>
                    <th>Department</th>
                    <th>Complaint Details</th>
                    </tr>
                    ${data.map(item => `
                    <tr>
                        <td>${item?.distance ? item.distance : " "}</td>
                        <td>${item?.farmerName}</td>
                        <td>${item?.saralId}</td>
                        <td>${item?.createdAt}</td>
                        <td>${item?.updatedAt}</td>
                        <td>${item?.district ? item.district : " "}</td>
                        <td>${item?.updatedBy}</td>
                        <td>${item?.department}</td>
                        <td>${item?.complaintDetails}</td>
                    </tr>
                    `).join('')}
                </table>
                <div class="footer">Generated on ${new Date().toLocaleDateString()}</div>
                </body>
            </html>`;
    
        // Launch Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
    
        // Set HTML content
        await page.setContent(htmlContent, { waitUntil: "load" });

        const pdfFileName = `DistanceReport.pdf`;
        const pdfPath = path.join(uploadsDir, pdfFileName);
    
        // Generate PDF
        await page.pdf({
            path: pdfPath,
            format: "A3",
            landscape: true,
            printBackground: true,
        });
    
        await browser.close();
        res.json({ message: "PDF generated successfully!", fileName: pdfFileName });
    }catch(error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }  
};

module.exports = {
    generateOverallReportPDF,
    generateDailyReportPDF,
    generateDistanceReportPDF
};