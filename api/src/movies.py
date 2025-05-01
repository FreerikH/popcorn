import os
from dotenv import load_dotenv
import logging
import redis
import requests
import json
import random
from functools import cached_property

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)-8s %(message)s'
)
logger = logging.getLogger(__name__)

class Movies():
    def __init__(self, redis):
        logger.info('Initializing Movies Class with Redis connection')
        self.redis = redis

        self.headers = {
            'Authorization': 'Bearer ' + os.getenv('TMDB_BEARER_TOKEN')
        }
        logger.debug('TMDB API authorization headers configured')
        
        # Don't load genres or streaming options until they're needed
        self._genres = None
        self._streaming_options = None
    
    @property
    def genres(self):
        """Lazy loading of genres - only fetch when needed"""
        if self._genres is None:
            logger.info('Loading movie genres from cache or API')
            self._genres = json.loads(self.redis.get('genres') or '{}')
            if self._genres == {}:
                logger.info('No cached genres found, fetching from TMDB API')
                self._genres = self.get_movie_genres()
                logger.info(f'Fetched {len(self._genres)} genres from TMDB API')
            else:
                logger.info(f'Loaded {len(self._genres)} genres from cache')
        return self._genres
    
    @property
    def streaming_options(self):
        """Lazy loading of streaming options - only calculate when needed"""
        if self._streaming_options is None:
            cached_movie_ids = [int(k[6:].decode('utf-8')) for k in self.redis.keys('movie_*')]
            logger.info(f'Found {len(cached_movie_ids)} cached movies in Redis')
            self._streaming_options = self.get_movie_ids_per_streaming_provider(cached_movie_ids)
        return self._streaming_options
    
    @streaming_options.setter
    def streaming_options(self, value):
        """Allow setting streaming options directly"""
        self._streaming_options = value

    def get_movie_genres(self):
        logger.info('Fetching movie genres from TMDB API')
        url = 'https://api.themoviedb.org/3/genre/movie/list'
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            genres = {g['id']: g['name'] for g in response.json()['genres']}
            logger.info(f'Successfully retrieved {len(genres)} genres')
            
            # Cache the genres
            self.redis.set('genres', json.dumps(genres))
            logger.info('Genres cached in Redis')
            
            return genres
        except requests.exceptions.RequestException as e:
            logger.error(f'Failed to fetch genres: {str(e)}')
            return {}

    def get_streaming_options(self, movie):
        movie_id = movie['id']
        logger.debug(f'Fetching streaming options for movie {movie_id}: "{movie.get("title", "Unknown")}"')
        url = f'https://api.themoviedb.org/3/movie/{movie_id}/watch/providers'
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            providers = [p['provider_name'] for p in (data.get('results', {}).get('DE', {})).get('flatrate', [])]
            
            if providers:
                logger.debug(f'Movie {movie_id} available on: {", ".join(providers)}')
            else:
                logger.debug(f'No streaming options found for movie {movie_id}')
                
            return providers
        except requests.exceptions.RequestException as e:
            logger.error(f'Failed to fetch streaming options for movie {movie_id}: {str(e)}')
            return []
    
    def ensure_streaming_provider_requirements(self, provider_requirements, max_loop_count=5):
        """
        Ensures that each streaming provider has the minimum required number of movies.
        Will fetch additional movies if requirements are not met, up to max_loop_count attempts.
        
        Args:
            provider_requirements (dict): Dictionary mapping provider names to minimum required count
            max_loop_count (int): Maximum number of attempts to meet requirements
            
        Returns:
            bool: True if requirements were met, False otherwise
        """
        requirements_met = False
        loop = 0
        logger.info('Checking streaming provider movie requirements')
        
        while not requirements_met and loop < max_loop_count:
            cached_movie_ids = [int(k[6:].decode('utf-8')) for k in self.redis.keys('movie_*')]
            logger.info(f'Found {len(cached_movie_ids)} cached movies in Redis')
            
            # Force refresh of streaming options
            self._streaming_options = self.get_movie_ids_per_streaming_provider(cached_movie_ids)
            logger.info(f'Available streaming providers: {", ".join(self.streaming_options.keys())}')
            
            # Check if requirements are met
            requirements_met = True
            for provider, min_count in provider_requirements.items():
                provider_count = len(self.streaming_options.get(provider, []))
                if provider_count < min_count:
                    logger.warning(f'Provider {provider} has only {provider_count}/{min_count} required movies')
                    requirements_met = False
                else:
                    logger.info(f'Provider {provider} meets requirements with {provider_count}/{min_count} movies')
            
            if not requirements_met:
                logger.info(f'Minimum streaming requirements not met, fetching additional movies (iteration {loop+1}/{max_loop_count})')
                self.add_movies_to_cache(without_ids=cached_movie_ids)
            
            loop += 1
        
        if requirements_met:
            logger.info('All streaming provider requirements met')
            return True
        else:
            logger.warning(f'Failed to meet all streaming provider requirements after {max_loop_count} attempts')
            return False
    
    def get_movie_ids_per_streaming_provider(self, cached_movie_ids):
        logger.info(f'Organizing {len(cached_movie_ids)} movies by streaming provider')
        streaming_options = {}
        processed_count = 0
        
        for movie_id in cached_movie_ids:
            try:
                movie = json.loads(self.redis.get(f'movie_{movie_id}'))
                for streaming_option in movie['streaming_options']:
                    if not streaming_option in streaming_options:
                        streaming_options[streaming_option] = []
                    streaming_options[streaming_option].append(movie['id'])
                processed_count += 1
            except Exception as e:
                logger.error(f'Error processing movie {movie_id}: {str(e)}')
        
        provider_counts = {provider: len(movies) for provider, movies in streaming_options.items()}
        logger.info(f'Processed {processed_count} movies across {len(streaming_options)} streaming providers')
        
        return streaming_options
                
    def add_movies_to_cache(self, without_ids=[], max_movies=100):
        logger.info(f'Adding up to {max_movies} new movies to cache (excluding {len(without_ids)} existing IDs)')
        url = 'https://api.themoviedb.org/3/discover/movie'
        seen_ids = set(without_ids)
        collected = 0
        page = 1
        api_calls = 0

        while collected < max_movies:
            params = {
                'sort_by': 'popularity.desc',
                'primary_release_date.lte': '2025-01-01',
                'page': page
            }
            
            logger.debug(f'Fetching movie page {page} from TMDB API')
            api_calls += 1
            
            try:
                response = requests.get(url, params=params, headers=self.headers)
                response.raise_for_status()
                results = response.json().get('results', [])

                if not results:
                    logger.info(f'No more results found after page {page}')
                    break
                
                logger.debug(f'Retrieved {len(results)} movies from page {page}')

                # skip already-seen movies
                filtered_results = [r for r in results if r['id'] not in seen_ids]
                logger.debug(f'Filtered to {len(filtered_results)} new movies (excluded {len(results) - len(filtered_results)} duplicates)')
                seen_ids.update(r['id'] for r in filtered_results)

                # enrich with genres - this will trigger genres loading if needed
                results = [r | {'genres': [self.genres.get(i, self.genres[str(i)]) for i in r['genre_ids']]} for r in filtered_results]
                logger.debug(f'Enriched {len(results)} movies with genre information')

                for movie in results:
                    logger.debug(f'Processing movie: {movie.get("id")} - "{movie.get("title", "Unknown")}"')
                    movie['streaming_options'] = self.get_streaming_options(movie)

                    key = 'movie_' + str(movie['id'])
                    value = json.dumps(movie)
                    self.redis.set(key, value)
                    logger.debug(f'Cached movie {movie["id"]} with {len(movie["streaming_options"])} streaming options')

                    collected += 1
                    if collected >= max_movies:
                        logger.info(f'Reached target of {max_movies} movies')
                        break

                page += 1
                
            except requests.exceptions.RequestException as e:
                logger.error(f'API request failed on page {page}: {str(e)}')
                break
                
        logger.info(f'Added {collected} new movies to cache (made {api_calls} API calls)')
        
        # Invalidate streaming options cache since we've added new movies
        self._streaming_options = None

    def ensure_multiple_requirements(self, requirements_list, max_retry_attempts=3):
        """
        Ensures that the Redis cache contains enough movies to fulfill multiple sets of requirements.
        Each requirement set consists of previously returned movies and required streaming options.
        
        Args:
            requirements_list (list): List of dictionaries, each containing:
                - previously_returned_movies (list): List of movie IDs to exclude
                - required_streaming_options (list): List of streaming providers the movies must be available on
            max_retry_attempts (int): Maximum number of attempts to try fetching more movies
                
        Returns:
            bool: True if all requirements were met, False otherwise
        """
        logger.info(f'Ensuring cache has enough movies to fulfill {len(requirements_list)} sets of requirements')
        
        all_requirements_met = True
        
        for i, req in enumerate(requirements_list):
            previously_returned_movies = req.get('previously_returned_movies', [])
            required_streaming_options = req.get('required_streaming_options', [])
            
            logger.info(f'Processing requirement set {i+1}/{len(requirements_list)}:')
            logger.info(f'- Excluding {len(previously_returned_movies)} previously returned movies')
            logger.info(f'- Required streaming options: {", ".join(required_streaming_options)}')
            
            # Create a requirements dict for the streaming options
            provider_requirements = {provider: 1 for provider in required_streaming_options}
            
            # First ensure we have movies for each streaming provider
            providers_met = self.ensure_streaming_provider_requirements(
                provider_requirements=provider_requirements,
                max_loop_count=max_retry_attempts
            )
            
            if not providers_met:
                logger.warning(f'Failed to meet streaming provider requirements for set {i+1}')
                all_requirements_met = False
                continue
            
            # Now check if we have enough unique movies that aren't in previously_returned_movies
            retry_count = 0
            requirement_met = False
            
            while not requirement_met and retry_count < max_retry_attempts:
                # Find valid streaming IDs for this requirement
                valid_streaming_ids = sorted([item for key in required_streaming_options for item in self.streaming_options.get(key, [])])
                logger.debug(f'Found {len(valid_streaming_ids)} movies available on required streaming services')
                
                # Exclude previously returned movies
                valid_ids = [i for i in valid_streaming_ids if i not in previously_returned_movies]
                logger.debug(f'{len(valid_ids)} movies available after excluding previously returned movies')
                
                # We need at least one valid movie to meet the requirement
                if valid_ids:
                    logger.info(f'Requirement set {i+1} met with {len(valid_ids)} valid movies available')
                    requirement_met = True
                else:
                    logger.warning(f'No valid movies found for requirement set {i+1}, fetching more (attempt {retry_count+1}/{max_retry_attempts})')
                    
                    # Try to fetch more movies
                    cached_movie_ids = [int(k[6:].decode('utf-8')) for k in self.redis.keys('movie_*')]
                    self.add_movies_to_cache(without_ids=cached_movie_ids)
                    
                    # Update streaming options after adding new movies - will be refreshed automatically
                    retry_count += 1
            
            if not requirement_met:
                logger.error(f'Failed to meet requirement set {i+1} after {max_retry_attempts} attempts')
                all_requirements_met = False
        
        if all_requirements_met:
            logger.info('Successfully met all requirement sets')
        else:
            logger.warning('Failed to meet one or more requirement sets')
        
        return all_requirements_met

    def get_random_movies(self, previously_returned_movies, required_streaming_options, max_retry_attempts=10, results=1):
        logger.info(f'Finding {results} unique random movies available on: {", ".join(required_streaming_options)}')
        logger.info(f'Excluding {len(previously_returned_movies)} previously returned movies')
        
        # Create a requirements dict for the streaming options
        provider_requirements = {provider: 1 for provider in required_streaming_options}
        retry_count = 0
        movies = []
        
        # Track the number of cached movies to detect whether we're making progress
        last_cached_count = 0
        
        while retry_count <= max_retry_attempts:
            # Get current count of cached movies
            current_cached_count = len([k for k in self.redis.keys('movie_*')])
            
            valid_streaming_ids = sorted([item for key in required_streaming_options for item in self.streaming_options.get(key, [])])
            logger.debug(f'Found {len(valid_streaming_ids)} movies available on required streaming services')
            
            valid_ids = [i for i in valid_streaming_ids if i not in previously_returned_movies]
            logger.debug(f'{len(valid_ids)} movies available after excluding previously returned movies')
            
            if valid_ids and len(valid_ids) >= results:
                # We have enough valid movies, so select randomly
                selected_movie_ids = random.sample(valid_ids, min(results, len(valid_ids)))
                logger.info(f'Selected {len(selected_movie_ids)} random movie IDs')
                
                movies = []
                retrieved_movie_ids = set()  # Track IDs we've already retrieved
                
                for movie_id in selected_movie_ids:
                    if movie_id in retrieved_movie_ids:
                        logger.debug(f'Skipping duplicate movie ID: {movie_id}')
                        continue
                        
                    try:
                        movie = json.loads(self.redis.get(f'movie_{movie_id}'))
                        logger.info(f'Retrieved movie: "{movie.get("title", "Unknown")}" ({movie.get("release_date", "Unknown")})')
                        logger.debug(f'Movie genres: {", ".join(movie.get("genres", []))}')
                        logger.debug(f'Movie streaming options: {", ".join(movie.get("streaming_options", []))}')
                        
                        # Add to our results and track the ID
                        movies.append(movie)
                        retrieved_movie_ids.add(movie_id)
                        
                    except Exception as e:
                        logger.error(f'Failed to retrieve movie {movie_id}: {str(e)}')
                
                # If we didn't get enough movies, try to get more
                if len(movies) < results and retry_count < max_retry_attempts:
                    logger.warning(f'Only retrieved {len(movies)}/{results} requested movies. Will try to fetch more movies.')
                    # Continue to the next iteration to fetch more
                else:
                    # Return what we have
                    logger.info(f'Returning {len(movies)} unique movies')
                    return movies
            
            # Not enough valid movies found, try to fetch more
            if retry_count < max_retry_attempts:
                logger.warning(f'Not enough valid movies found matching criteria. Attempting to fetch more (attempt {retry_count+1}/{max_retry_attempts})')
                
                # Check if we've made progress in adding new movies
                if current_cached_count <= last_cached_count:
                    logger.warning(f'No new movies added in last attempt (still at {current_cached_count} movies). Increasing fetch count.')
                    # Double the number of movies to fetch each time we're not making progress
                    fetch_count = 100 * (2 ** (retry_count // 2))  # Increase exponentially but not too fast
                    logger.info(f'Attempting to fetch {fetch_count} new movies')
                else:
                    fetch_count = 100  # Default fetch count
                    
                # Try to add more movies that match our streaming requirements
                cached_movie_ids = [int(k[6:].decode('utf-8')) for k in self.redis.keys('movie_*')]
                excluded_ids = cached_movie_ids + previously_returned_movies
                
                # Call add_movies_to_cache directly with increased count
                self.add_movies_to_cache(without_ids=excluded_ids, max_movies=fetch_count)
                
                # Force refresh of streaming options after adding new movies
                self._streaming_options = None
                
                # Update our last cached count for the next iteration
                last_cached_count = current_cached_count
                
                retry_count += 1
            else:
                logger.error(f'Failed to find enough valid movies after {max_retry_attempts} attempts to fetch more')
                break
        
        logger.info(f'Returning {len(movies)} unique movies (fewer than requested)')
        return movies

    def OLD_get_random_movies(self, previously_returned_movies, required_streaming_options, max_retry_attempts=10, results=1):
        """
        Get random movies that are available on the required streaming options and haven't been returned before.
        If no valid movies are found, attempts to fetch more movies to the cache.
        
        Args:
            previously_returned_movies (list): List of movie IDs to exclude
            required_streaming_options (list): List of streaming providers the movies must be available on
            max_retry_attempts (int): Maximum number of times to try fetching more movies if none are found
            results (int): Number of random movies to return
            
        Returns:
            list: A list of unique random movies matching the criteria, or empty list if none could be found
        """
        logger.info(f'Finding {results} unique random movies available on: {", ".join(required_streaming_options)}')
        logger.info(f'Excluding {len(previously_returned_movies)} previously returned movies')
        
        # Create a requirements dict for the streaming options
        provider_requirements = {provider: 1 for provider in required_streaming_options}
        retry_count = 0
        movies = []
        
        while retry_count <= max_retry_attempts:
            valid_streaming_ids = sorted([item for key in required_streaming_options for item in self.streaming_options.get(key, [])])
            logger.debug(f'Found {len(valid_streaming_ids)} movies available on required streaming services')
            
            valid_ids = [i for i in valid_streaming_ids if i not in previously_returned_movies]
            logger.debug(f'{len(valid_ids)} movies available after excluding previously returned movies')
            
            if valid_ids and len(valid_ids) >= results:
                # We have enough valid movies, so select randomly
                selected_movie_ids = random.sample(valid_ids, min(results, len(valid_ids)))
                logger.info(f'Selected {len(selected_movie_ids)} random movie IDs')
                
                movies = []
                retrieved_movie_ids = set()  # Track IDs we've already retrieved
                
                for movie_id in selected_movie_ids:
                    if movie_id in retrieved_movie_ids:
                        logger.debug(f'Skipping duplicate movie ID: {movie_id}')
                        continue
                        
                    try:
                        movie = json.loads(self.redis.get(f'movie_{movie_id}'))
                        logger.info(f'Retrieved movie: "{movie.get("title", "Unknown")}" ({movie.get("release_date", "Unknown")})')
                        logger.debug(f'Movie genres: {", ".join(movie.get("genres", []))}')
                        logger.debug(f'Movie streaming options: {", ".join(movie.get("streaming_options", []))}')
                        
                        # Add to our results and track the ID
                        movies.append(movie)
                        retrieved_movie_ids.add(movie_id)
                        
                    except Exception as e:
                        logger.error(f'Failed to retrieve movie {movie_id}: {str(e)}')
                
                # If we didn't get enough movies, try to get more
                if len(movies) < results and retry_count < max_retry_attempts:
                    logger.warning(f'Only retrieved {len(movies)}/{results} requested movies. Will try to fetch more movies.')
                    # Continue to the next iteration to fetch more
                else:
                    # Return what we have
                    logger.info(f'Returning {len(movies)} unique movies')
                    return movies
            
            # Not enough valid movies found, try to fetch more
            if retry_count < max_retry_attempts:
                logger.warning(f'Not enough valid movies found matching criteria. Attempting to fetch more (attempt {retry_count+1}/{max_retry_attempts})')
                
                # Try to add more movies that match our streaming requirements
                cached_movie_ids = [int(k[6:].decode('utf-8')) for k in self.redis.keys('movie_*')]
                excluded_ids = cached_movie_ids + previously_returned_movies
                success = self.ensure_streaming_provider_requirements(
                    provider_requirements=provider_requirements,
                    max_loop_count=1
                )
                
                if success:
                    logger.info('Successfully added more movies to cache, retrying selection')
                else:
                    logger.warning('Failed to add sufficient movies to cache for the required streaming providers')
                
                retry_count += 1
            else:
                logger.error(f'Failed to find enough valid movies after {max_retry_attempts} attempts to fetch more')
                break
        
        logger.info(f'Returning {len(movies)} unique movies (fewer than requested)')
        return movies
    
    def get_movie(self, movie_id):
        """
        Retrieves a specific movie by its ID from the Redis cache.
        
        Args:
            movie_id (int): The ID of the movie to retrieve
                
        Returns:
            dict: The movie data as a dictionary, or None if not found
        """
        logger.info(f'Retrieving movie with ID: {movie_id}')
        
        try:
            movie_key = f'movie_{movie_id}'
            if not self.redis.exists(movie_key):
                logger.warning(f'Movie {movie_id} not found in cache')
                return None
                
            movie = json.loads(self.redis.get(movie_key))
            logger.info(f'Successfully retrieved movie: "{movie.get("title", "Unknown")}" ({movie.get("release_date", "Unknown")})')
            logger.debug(f'Movie genres: {", ".join(movie.get("genres", []))}')
            logger.debug(f'Movie streaming options: {", ".join(movie.get("streaming_options", []))}')
            
            return movie
        except Exception as e:
            logger.error(f'Failed to retrieve movie {movie_id}: {str(e)}')
            return None
    
    def get_movies(self, movie_ids):
        """
        Retrieves multiple movies by their IDs from the Redis cache.
        
        Args:
            movie_ids (list): A list of movie IDs to retrieve
            
        Returns:
            dict: A dictionary mapping movie IDs to their data, excluding any not found
        """
        logger.info(f'Retrieving {len(movie_ids)} movies')
        
        movies = {}
        not_found = []
        
        try:
            for movie_id in movie_ids:
                movie_key = f'movie_{movie_id}'
                if not self.redis.exists(movie_key):
                    logger.warning(f'Movie {movie_id} not found in cache')
                    not_found.append(movie_id)
                    continue
                    
                movie = json.loads(self.redis.get(movie_key))
                movies[movie_id] = movie
                logger.info(f'Successfully retrieved movie: "{movie.get("title", "Unknown")}" ({movie.get("release_date", "Unknown")})')
                logger.debug(f'Movie genres: {", ".join(movie.get("genres", []))}')
                logger.debug(f'Movie streaming options: {", ".join(movie.get("streaming_options", []))}')
            
            if not_found:
                logger.warning(f'The following movies were not found: {", ".join(map(str, not_found))}')
                
            logger.info(f'Successfully retrieved {len(movies)} out of {len(movie_ids)} requested movies')
            return movies
        except Exception as e:
            logger.error(f'Failed to retrieve movies: {str(e)}')
            return {}