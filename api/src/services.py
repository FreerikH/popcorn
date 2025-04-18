from dotenv import load_dotenv
import os
import requests
import random
from sqlalchemy import create_engine, text

load_dotenv()


class API:
    def __init__(self):
        self.movie_url = 'https://api.themoviedb.org/3/movie/'
        self.image_url = 'https://image.tmdb.org/t/p/original/'
        self.headers = {
            'Authorization': 'Bearer ' + os.getenv('TMDB_BEARER_TOKEN')
        }
    
    def get_movie(self, movie_id = None):
        if movie_id is None:
            movie_id = random.randint(1, 100)
        url = self.movie_url + str(movie_id)
        response = requests.get(url, headers = self.headers)
        response_json = response.json()
        if response.status_code != 200:
            return response_json

        # url is directly resolved
        response_json['poster_path'] = self.image_url + response_json['poster_path']

        return response_json

class DB:
    def __init__(self):
        self.engine = create_engine(os.getenv('DB_CONNECTION_STRING'))

    def update_preference(self, data):
        sql = '''
            INSERT INTO preferences (
                user_id, 
                movie_id,
                rating
            ) VALUES (
                :user_id,
                :movie_id,
                :rating
            )
        '''
        try:
            with self.engine.connect() as connection:
                connection.execute(text(sql), data)
                connection.commit()
            return True
        except Exception as e:
            return False
