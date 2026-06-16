## Installation and Running Instructions

### Requirements

* Python 3.12 or newer
* A web browser
* MovieLens `ml-latest-small` dataset

---

## Backend Setup

Open a terminal in the project folder and go to the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python3 -m venv .venv
```

Activate it:

```bash
source .venv/bin/activate
```

On Windows, use:

```bash
.venv\Scripts\activate
```

Install the required packages:

```bash
pip install -r requirements.txt
```

Run the backend server:

```bash
uvicorn main:app --host 0.0.0.0 --port 3000 --reload
```

The backend API will be available at:

```text
http://localhost:3000/docs
```

---

## Frontend Setup

Open a second terminal and go to the frontend folder:

```bash
cd frontend
```

Run a simple local web server:

```bash
python3 -m http.server 5500
```

On Windows, use:

```bash
python -m http.server 5500
```

Then open this URL in the browser:

```text
http://localhost:5500
```

---

## Running the Full Application

1. Start the backend server on port `3000`.
2. Start the frontend server on port `5500`.
3. Open `http://localhost:5500` in the browser.
4. Use the web app to search movies, rate movies, add movies, and request recommendations.

The frontend communicates with the backend using:

```js
http://localhost:3000/movielens/api
```
