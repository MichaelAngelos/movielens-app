const API_BASE = "http://localhost:3000/movielens/api";

let userRatings = [];
let selectedRatings = {};

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

function addMovieRow(movie) {
    const tableBody = document.getElementById("moviesTableBody");
    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${movie.movieId}</td>
        <td>${movie.title}</td>
        <td>${movie.genres}</td>
        <td id="avg-${movie.movieId}">Loading...</td>
        <td class="rating-column">
            <div class="stars" id="stars-${movie.movieId}">
                <button type="button" onclick="selectStar(event, ${movie.movieId}, 1)">★</button>
                <button type="button" onclick="selectStar(event, ${movie.movieId}, 2)">★</button>
                <button type="button" onclick="selectStar(event, ${movie.movieId}, 3)">★</button>
                <button type="button" onclick="selectStar(event, ${movie.movieId}, 4)">★</button>
                <button type="button" onclick="selectStar(event, ${movie.movieId}, 5)">★</button>
            </div>
        </td>
        <td>
            <button type="button" onclick="rateMovie(${movie.movieId})">Rate</button>
        </td>
    `;

    tableBody.appendChild(row);
    loadAverageRating(movie.movieId);
}

function selectStar(event, movieId, starNumber) {
    const star = event.target;
    const rect = star.getBoundingClientRect();
    const clickX = event.clientX - rect.left;

    let rating;

    if (clickX < rect.width / 2) {
        rating = starNumber - 0.5;
    } else {
        rating = starNumber;
    }

    selectedRatings[movieId] = rating;

    const stars = document.querySelectorAll(`#stars-${movieId} button`);

    stars.forEach((starButton, index) => {
        const currentStar = index + 1;

        starButton.classList.remove("selected", "half-selected");

        if (rating >= currentStar) {
            starButton.classList.add("selected");
        } else if (rating === currentStar - 0.5) {
            starButton.classList.add("half-selected");
        }
    });
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

        if (data.averageRating !== undefined && data.averageRating !== null) {
            avgCell.textContent = Number(data.averageRating).toFixed(2);
        } else {
            const total = data.ratings.reduce((sum, r) => sum + Number(r.rating), 0);
            const average = total / data.ratings.length;
            avgCell.textContent = average.toFixed(2);
        }
    } catch (error) {
        avgCell.textContent = "Error";
    }
}

function rateMovie(movieId) {
    const rating = selectedRatings[movieId];

    if (!rating) {
        alert("Please select a star rating first.");
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
            <td class="rating-column">${r.rating}</td>
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