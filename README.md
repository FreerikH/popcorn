# popcorn

## setup virtual environment
`python -m venv venv`

`venv\Scripts\activate`

## create react app
`npm create vite@latest app`

`npm install`

`npm run dev`

## requirments
TMDB_BEARER_TOKEN as environmetal variable or in .env

DB_CONNECTION_STRING as environmetal variable or in .env

databse needs a table called preferences with these columns: user_id, movie_id, rating


## render.com

### build

`npm install --prefix app && npm run build --prefix app; pip install -r api/requirements.txt`

### start

`uvicorn api.src.main:app --host 0.0.0.0 --port $PORT`

## flow

- open webpage
- get movie from server
- return movie + rating to server
- save user + movie + rating in database
- new loop