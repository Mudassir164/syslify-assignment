const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const CreateRelease = require('./models/CreateRelease');
const ListReleases = require('./models/ListReleases');
const { authenticateAPIKey } = require('./middleware');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// MySQL database connection
// MySQL database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

// Route to create a new release
const createReleaseRoute = (db) => (req, res) => {
    let createRelease;
    try {
        createRelease = new CreateRelease(req.body);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    const query = 'INSERT INTO releases (name, version, account, region) VALUES (?, ?, ?, ?)';
    db.query(query, [createRelease.name, createRelease.version, createRelease.account, createRelease.region], (err, result) => {
        if (err) {
            console.error('Error inserting release:', err);
            return res.status(500).json({ error: 'Failed to create release.' });
        }
        res.status(201).json({ message: 'Release created successfully.', releaseId: result.insertId });
    });
};

// Route to get all releases with pagination
const listReleasesRoute = (db) => (req, res) => {
    let listReleases;
    try {
        listReleases = new ListReleases(req.query);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    const query = 'SELECT * FROM releases ORDER BY created_at DESC LIMIT ? OFFSET ?';
    db.query(query, [listReleases.limit, listReleases.offset], (err, results) => {
        if (err) {
            console.error('Error fetching releases:', err);
            return res.status(500).json({ error: 'Failed to fetch releases.' });
        }
        res.status(200).json(results);
    });
};



const detectDriftRoute = (db) => async (req, res) => {
    try {
        // Query to get the latest version of each application
        const latestVersionQuery = `
            SELECT name, MAX(version) as latest_version
            FROM releases
            GROUP BY name
        `;
        
        // Query to get the current versions of each application in every account and region
        const currentVersionQuery = `
            SELECT name, version, account, region
            FROM releases
        `;

        // Execute the queries and handle results properly
        const latestVersions = await new Promise((resolve, reject) => {
            db.query(latestVersionQuery, (err, result) => {
                if (err) {
                    console.error('Error executing latestVersionQuery:', err);
                    reject(err);
                }
                resolve(result);
            });
        });

        const currentVersions = await new Promise((resolve, reject) => {
            db.query(currentVersionQuery, (err, result) => {
                if (err) {
                    console.error('Error executing currentVersionQuery:', err);
                    reject(err);
                }
                resolve(result);
            });
        });

        // If no data is found, return an error response
        if (!latestVersions || !currentVersions) {
            console.error('Query did not return data');
            return res.status(500).json({ error: 'No data found.' });
        }

        // Initialize drift report
        const driftReport = {};

        // Loop through current versions and check for drifts
        currentVersions.forEach(({ name, version, account, region }) => {
            const latestVersion = latestVersions.find(app => app.name === name)?.latest_version;

            if (latestVersion && version !== latestVersion) {
                if (!driftReport[name]) {
                    driftReport[name] = {
                        latest: latestVersion,
                        drift: {}
                    };
                }

                if (!driftReport[name].drift[account]) {
                    driftReport[name].drift[account] = {};
                }

                driftReport[name].drift[account][region] = version;
            }
        });

        // Return the drift report as JSON
        return res.status(200).json(driftReport);

    } catch (error) {
        // Log detailed error message
        console.error('Error detecting drift:', error);
        return res.status(500).json({ error: 'Failed to detect drift.' });
    }
};



// Inject dependencies into routes
// Secure the release endpoints with API key authentication
app.post('/release', authenticateAPIKey, createReleaseRoute(db));
app.get('/releases', authenticateAPIKey, listReleasesRoute(db));
app.get('/drift', authenticateAPIKey, detectDriftRoute(db));

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
