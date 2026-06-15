const API_BASE = "http://localhost:3000/movielens/api";

let userRatings = [];

document.getElementById("addMovieBtn").addEventListener("click", addMovie);
document.getElementById("searchBtn").addEventListener("click", searchMovies);
document.getElementById("recommendBtn").addEventListener("click", getRecommendations);

async function addMovie() {
    const title = document.getElementById("movieTitle").value.trim();
    const genres = document.getElementById("movieGenres").value.trim();
    const message = document.getElementById("addMovieMessage");

    message.textContent = "";

    if (!title || !genres) {
        message.textContent = "Please enter both title and genres.";
        message.className = "error";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/movies`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: title,
                genres: genres
            })
        });

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            throw new Error("Movie could not be added.");
        }

        message.textContent = `Movie added successfully. New movie ID: ${data.movieId}`;
        message.className = "success";

        document.getElementById("movieTitle").value = "";
        document.getElementById("movieGenres").value = "";
    } catch (error) {
        message.textContent = "Error: " + error.message;
        message.className = "error";
    }
}

async function searchMovies() {
    const keyword = document.getElementById("searchInput").value.trim();
    const message = document.getElementById("searchMessage");
    const tableBody = document.getElementById("moviesTableBody");

    message.textContent = "";
    tableBody.innerHTML = "";

    if (!keyword) {
        message.textContent = "Please enter a search keyword.";
        message.className = "error";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/movies?search=${encodeURIComponent(keyword)}`);
        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            throw new Error("Search failed.");
        }

        if (data.movies.length === 0) {
            message.textContent = "No movies found.";
            message.className = "error";
            return;
        }

        message.textContent = `${data.movies.length} movie(s) found.`;
        message.className = "success";

        data.movies.forEach(movie => {
            addMovieRow(movie);
        });
    } catch (error) {
        message.textContent = "Error: " + error.message;
        message.className = "error";
    }
}

async function addMovieRow(movie) {
    const tableBody = document.getElementById("moviesTableBody");

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${movie.movieId}</td>
        <td>${movie.title}</td>
        <td>${movie.genres}</td>
        <td id="avg-${movie.movieId}">Loading...</td>
        <td>
            <input type="number" min="0.5" max="5" step="0.5" id="rating-${movie.movieId}" placeholder="0.5 - 5">
        </td>
        <td>
            <button onclick="rateMovie(${movie.movieId})">Rate</button>
        </td>
    `;

    tableBody.appendChild(row);

    loadAverageRating(movie.movieId);
}

async function loadAverageRating(movieId) {
    const avgCell = document.getElementById(`avg-${movieId}`);

    try {
        const response = await fetch(`${API_BASE}/ratings/${movieId}`);
        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            throw new Error("Could not load ratings.");
        }

        if (data.ratings.length === 0) {
            avgCell.textContent = "No ratings";
            return;
        }

        if (data.averageRating === null) {
            avgCell.textContent = "No ratings";
        } else {
            avgCell.textContent = data.averageRating.toFixed(2);
        }
    } catch (error) {
        avgCell.textContent = "Error";
    }
}

function rateMovie(movieId) {
    const input = document.getElementById(`rating-${movieId}`);
    const rating = Number(input.value);

    if (!rating || rating < 0.5 || rating > 5) {
        alert("Please enter a rating between 0.5 and 5.");
        return;
    }

    const existingRating = userRatings.find(r => r.movieId === movieId);

    if (existingRating) {
        existingRating.rating = rating;
    } else {
        userRatings.push({
            movieId: movieId,
            rating: rating
        });
    }

    renderUserRatings();
}

function renderUserRatings() {
    const tableBody = document.getElementById("userRatingsTableBody");
    tableBody.innerHTML = "";

    userRatings.forEach(r => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${r.movieId}</td>
            <td>${r.rating}</td>
        `;

        tableBody.appendChild(row);
    });
}

async function getRecommendations() {
    const message = document.getElementById("recommendMessage");
    const tableBody = document.getElementById("recommendationsTableBody");

    message.textContent = "";
    tableBody.innerHTML = "";

    if (userRatings.length < 2) {
        message.textContent = "Please rate at least 2 movies before requesting recommendations.";
        message.className = "error";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/recommendations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ratings: userRatings
            })
        });

        const data = await response.json();

        if (!response.ok || data.status !== "success") {
            throw new Error("Could not get recommendations.");
        }

        if (data.recommendations.length === 0) {
            message.textContent = "No recommendations available. Try rating more movies.";
            message.className = "error";
            return;
        }

        message.textContent = "Recommendations loaded successfully.";
        message.className = "success";

        data.recommendations.forEach(movie => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${movie.movieId}</td>
                <td>${movie.title}</td>
                <td>${movie.genres}</td>
                <td>${movie.predictedRating}</td>
            `;

            tableBody.appendChild(row);
        });
    } catch (error) {
        message.textContent = "Error: " + error.message;
        message.className = "error";
    }
}