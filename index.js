// api/index.js
const express = require('express');
const axios = require('axios');
const XLSX = require('xlsx');

const app = express();
const port = process.env.PORT || 3000;

// Replace with your actual Google Places API key
const API_KEY = 'AIzaSyCNYYSU9kTgJFFLXgV27YU1lWsp1mrpsZA';
const SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

app.get('/:category', async (req, res) => {
    const category = req.params.category;
    let companies = [];
    let nextPageToken = null;
    const MIN_RESULTS = 100;

    try {
        do {
            // Fetch the data from the Google Places API
            const searchResponse = await axios.get(`${SEARCH_URL}?query=${category}+companies+in+Sri+Lanka&key=${API_KEY}${nextPageToken ? `&pagetoken=${nextPageToken}` : ''}`);
            const places = searchResponse.data.results;

            // Fetch details for each place
            const placeDetailsRequests = places.map(place =>
                axios.get(`${DETAILS_URL}?place_id=${place.place_id}&key=${API_KEY}`)
            );
            const detailsResponses = await Promise.all(placeDetailsRequests);

            // Add details to the companies array
            companies = companies.concat(detailsResponses.map((response, index) => {
                const place = places[index];
                const details = response.data.result;
                return {
                    Name: place.name,
                    Phone: details.formatted_phone_number || 'N/A',
                    Email: 'N/A' // Google Places API does not return emails
                };
            }));

            // Check if there are more pages to fetch
            nextPageToken = searchResponse.data.next_page_token;

            // Wait a bit before fetching the next page to avoid rate limiting
            if (nextPageToken) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } while (nextPageToken && companies.length < MIN_RESULTS);

        // Trim the results if there are more than needed
        companies = companies.slice(0, MIN_RESULTS);

        // Create a new workbook and add a worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(companies);

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // Set the response headers to indicate a file attachment
        res.setHeader('Content-Disposition', 'attachment; filename=companies.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Send the buffer as the response
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching data');
    }
});

app.get('/', async (req, res) => {
    res.json({ "Hello": "Internhub" });
});

// Export the Express app to handle requests
module.exports = app;
