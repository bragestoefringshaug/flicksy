/**
 * Movie Database API Service
 * 
 * This service handles all interactions with The Movie Database (TMDB) API.
 * It provides methods to fetch movies, TV shows, search content, and get recommendations.
 * 
 * @author Flicksy Team
 * @version 1.0.0
 */

import Constants from 'expo-constants';

// TMDB API Configuration Constants



const TMDB_BASE_URL = 'https://api.themoviedb.org/3'; // Base URL for TMDB API v3
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'; // Base URL for TMDB images

/**
 * Movie Interface
 * 
 * Defines the structure of a movie object returned by the TMDB API.
 * This interface ensures type safety when working with movie data.
 */
export interface Movie {
  id: number; // Unique identifier for the movie
  title: string; // The movie's title
  overview: string; // Brief description of the movie
  poster_path: string | null; // Path to the movie's poster image
  backdrop_path: string | null; // Path to the movie's backdrop image
  release_date: string; // Release date in YYYY-MM-DD format
  vote_average: number; // Average rating (0-10)
  vote_count: number; // Number of votes received
  genre_ids: number[]; // Array of genre IDs
  adult: boolean; // Whether the movie is for adults only
  original_language: string; // Original language code (e.g., 'en', 'es')
  original_title: string; // Title in the original language
  popularity: number; // Popularity score
  video: boolean; // Whether the movie has video content
}

/**
 * TV Show Interface
 * 
 * Defines the structure of a TV show object returned by the TMDB API.
 * Similar to Movie but with TV-specific properties like first_air_date.
 */
export interface TVShow {
  id: number; // Unique identifier for the TV show
  name: string; // The TV show's name
  overview: string; // Brief description of the TV show
  poster_path: string | null; // Path to the TV show's poster image
  backdrop_path: string | null; // Path to the TV show's backdrop image
  first_air_date: string; // First air date in YYYY-MM-DD format
  vote_average: number; // Average rating (0-10)
  vote_count: number; // Number of votes received
  genre_ids: number[]; // Array of genre IDs
  adult: boolean; // Whether the TV show is for adults only
  original_language: string; // Original language code (e.g., 'en', 'es')
  original_name: string; // Name in the original language
  popularity: number; // Popularity score
  origin_country: string[]; // Array of country codes where the show originated
}

/**
 * Genre Interface
 * 
 * Represents a genre with its ID and name.
 * Used for categorizing movies and TV shows.
 */
export interface Genre {
  id: number; // Unique identifier for the genre
  name: string; // Human-readable name of the genre (e.g., "Action", "Comedy")
}

/**
 * Movie Response Interface
 * 
 * Structure of the response when fetching a list of movies from TMDB API.
 * Includes pagination information and the array of movies.
 */
export interface MovieResponse {
  page: number; // Current page number
  results: Movie[]; // Array of movies for this page
  total_pages: number; // Total number of pages available
  total_results: number; // Total number of movies available
}

/**
 * TV Response Interface
 * 
 * Structure of the response when fetching a list of TV shows from TMDB API.
 * Includes pagination information and the array of TV shows.
 */
export interface TVResponse {
  page: number; // Current page number
  results: TVShow[]; // Array of TV shows for this page
  total_pages: number; // Total number of pages available
  total_results: number; // Total number of TV shows available
}

/**
 * Genres Response Interface
 * 
 * Structure of the response when fetching available genres from TMDB API.
 */
export interface GenresResponse {
  genres: Genre[]; // Array of available genres
}

/**
 * MovieApiService Class
 * 
 * Main service class that handles all TMDB API interactions.
 * Provides methods for fetching movies, TV shows, searching, and getting recommendations.
 * 
 * Features:
 * - Automatic genre mapping and caching
 * - Error handling for API requests
 * - Image URL generation
 * - Mixed content discovery
 */
class MovieApiService {
  private apiKey: string; // TMDB API key for authentication
  private genreMap: Map<number, string> | null = null; // Cached genre ID to name mapping
  private genreMapFetchedAt: number | null = null; // Timestamp when genre map was last fetched

  /**
   * Constructor
   * 
   * Initializes the service with the TMDB API key.
   * The API key is required for all TMDB API requests.
   */
  constructor() {
    // Load the TMDB API key from environment variables or Expo config
    // First try to get from process.env (for development)
    let apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
    
    // If not found in process.env, try to get from Expo config
    if (!apiKey) {
      apiKey = Constants.expoConfig?.extra?.tmdbApiKey;
    }
    
    if (!apiKey) {
      throw new Error("TMDB API key not found. Please set EXPO_PUBLIC_TMDB_API_KEY in your .env file.");
    }
    this.apiKey = apiKey;
  }

  /**
   * Private method to make HTTP requests to the TMDB API
   * 
   * @param endpoint - The API endpoint to call (e.g., '/movie/popular')
   * @returns Promise<T> - The parsed JSON response from the API
   * @throws Error if the request fails or returns an error status
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    // Determine if we need to add '?' or '&' to append the API key
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${TMDB_BASE_URL}${endpoint}${separator}api_key=${this.apiKey}`;
    
    console.log('Making API request to:', url);
    
    try {
      const response = await fetch(url);
      
      // Handle different HTTP error status codes
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your TMDB API key in services/movieApi.ts');
        } else if (response.status === 404) {
          console.error(`404 Error - Full URL: ${url}`);
          console.error(`Endpoint: ${endpoint}`);
          // For movie/TV endpoints, this might be a missing resource
          if (endpoint.includes('/movie/')) {
            throw new Error(`Movie not found: ${endpoint}. This movie may not exist in TMDB database.`);
          } else if (endpoint.includes('/tv/')) {
            throw new Error(`TV show not found: ${endpoint}. This TV show may not exist in TMDB database.`);
          } else {
            throw new Error(`API endpoint not found: ${endpoint}. Please check the endpoint URL.`);
          }
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      // Parse and return the JSON response
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Ensures the genre map is loaded and cached
   * 
   * This method fetches genre data from TMDB API and caches it for 24 hours.
   * It combines both movie and TV genres into a single map for easy lookup.
   * The cache prevents unnecessary API calls for genre data.
   */
  private async ensureGenreMap(): Promise<void> {
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = Date.now();
    
    // Return early if we have a valid cached genre map
    if (this.genreMap && this.genreMapFetchedAt && now - this.genreMapFetchedAt < CACHE_TTL_MS) {
      return;
    }
    
    try {
      // Fetch both movie and TV genres in parallel
      const [movieGenres, tvGenres] = await Promise.all([
        this.getMovieGenres(),
        this.getTVGenres(),
      ]);
      
      // Create a combined genre map
      const map = new Map<number, string>();
      for (const g of movieGenres.genres) map.set(g.id, g.name);
      for (const g of tvGenres.genres) map.set(g.id, g.name);
      
      // Update cache
      this.genreMap = map;
      this.genreMapFetchedAt = now;
    } catch (e) {
      // On failure, keep prior cache if any; otherwise leave null
      console.error('Failed to fetch genres:', e);
    }
  }

  /**
   * Maps genre IDs to their human-readable names
   * 
   * @param ids - Array of genre IDs to convert
   * @returns Promise<string[]> - Array of genre names
   */
  async mapGenreIdsToNames(ids: number[]): Promise<string[]> {
    await this.ensureGenreMap();
    if (!this.genreMap) return [];
    
    const names: string[] = [];
    for (const id of ids) {
      const name = this.genreMap.get(id);
      if (name) names.push(name);
    }
    return names;
  }


  async getGenreNameToIdMap(): Promise<Map<string, number>> {
    await this.ensureGenreMap();
    const result = new Map<string, number>();
    if (!this.genreMap) return result;
    for (const [id, name] of this.genreMap.entries()) {
      result.set(name, id);
    }
    return result;
  }

  async mapGenreNamesToIds(names: string[]): Promise<number[]> {
    await this.ensureGenreMap();
    if (!this.genreMap) return [];
    const nameToId = await this.getGenreNameToIdMap();
    const ids: number[] = [];
    for (const name of names) {
      const id = nameToId.get(name);
      if (typeof id === 'number') ids.push(id);
    }
    return ids;
  }

  // Get popular movies

  // ==================== MOVIE METHODS ====================

  /**
   * Get popular movies
   * 
   * @param page - Page number for pagination (default: 1)
   * @returns Promise<MovieResponse> - Response containing popular movies
   */

  async getPopularMovies(page: number = 1): Promise<MovieResponse> {
    return this.makeRequest<MovieResponse>(`/movie/popular?page=${page}`);
  }

  /**
   * Get top rated movies
   * 
   * @param page - Page number for pagination (default: 1)
   * @returns Promise<MovieResponse> - Response containing top rated movies
   */
  async getTopRatedMovies(page: number = 1): Promise<MovieResponse> {
    return this.makeRequest<MovieResponse>(`/movie/top_rated?page=${page}`);
  }

  /**
   * Get trending movies for the current week
   * 
   * @param page - Page number for pagination (default: 1)
   * @returns Promise<MovieResponse> - Response containing trending movies
   */
  async getTrendingMovies(page: number = 1): Promise<MovieResponse> {
    return this.makeRequest<MovieResponse>(`/trending/movie/week?page=${page}`);
  }

  // ==================== TV SHOW METHODS ====================

  /**
   * Get popular TV shows
   * 
   * @param page - Page number for pagination (default: 1)
   * @returns Promise<TVResponse> - Response containing popular TV shows
   */
  async getPopularTVShows(page: number = 1): Promise<TVResponse> {
    return this.makeRequest<TVResponse>(`/tv/popular?page=${page}`);
  }

  /**
   * Get top rated TV shows
   * 
   * @param page - Page number for pagination (default: 1)
   * @returns Promise<TVResponse> - Response containing top rated TV shows
   */
  async getTopRatedTVShows(page: number = 1): Promise<TVResponse> {
    return this.makeRequest<TVResponse>(`/tv/top_rated?page=${page}`);
  }

  /**
   * Get trending TV shows for the current week
   * 
   * @param page - Page number for pagination (default: 1)
   * @returns Promise<TVResponse> - Response containing trending TV shows
   */
  async getTrendingTVShows(page: number = 1): Promise<TVResponse> {
    return this.makeRequest<TVResponse>(`/trending/tv/week?page=${page}`);
  }

  // ==================== GENRE METHODS ====================

  /**
   * Get available movie genres
   * 
   * @returns Promise<GenresResponse> - Response containing movie genres
   */
  async getMovieGenres(): Promise<GenresResponse> {
    return this.makeRequest<GenresResponse>('/genre/movie/list');
  }

  /**
   * Get available TV show genres
   * 
   * @returns Promise<GenresResponse> - Response containing TV show genres
   */
  async getTVGenres(): Promise<GenresResponse> {
    return this.makeRequest<GenresResponse>('/genre/tv/list');
  }

  // ==================== DETAIL METHODS ====================

  /**
   * Get detailed information about a specific movie
   * 
   * @param movieId - The TMDB ID of the movie
   * @returns Promise<Movie> - Detailed movie information
   */
  async getMovieDetails(movieId: number): Promise<Movie> {
    return this.makeRequest<Movie>(`/movie/${movieId}`);
  }

  /**
   * Get detailed information about a specific TV show
   * 
   * @param tvId - The TMDB ID of the TV show
   * @returns Promise<TVShow> - Detailed TV show information
   */
  async getTVShowDetails(tvId: number): Promise<TVShow> {
    return this.makeRequest<TVShow>(`/tv/${tvId}`);
  }

  // ==================== SEARCH METHODS ====================

  /**
   * Search for movies by query string
   * 
   * @param query - Search query string
   * @param page - Page number for pagination (default: 1)
   * @returns Promise<MovieResponse> - Response containing matching movies
   */
  async searchMovies(query: string, page: number = 1): Promise<MovieResponse> {
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest<MovieResponse>(`/search/movie?query=${encodedQuery}&page=${page}`);
  }

  /**
   * Search for TV shows by query string
   * 
   * @param query - Search query string
   * @param page - Page number for pagination (default: 1)
   * @returns Promise<TVResponse> - Response containing matching TV shows
   */
  async searchTVShows(query: string, page: number = 1): Promise<TVResponse> {
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest<TVResponse>(`/search/tv?query=${encodedQuery}&page=${page}`);
  }

  // ==================== RECOMMENDATION METHODS ====================

  /**
   * Get movie recommendations based on a specific movie
   * 
   * @param movieId - The TMDB ID of the movie to get recommendations for
   * @param page - Page number for pagination (default: 1)
   * @returns Promise<MovieResponse> - Response containing recommended movies
   */
  async getMovieRecommendations(movieId: number, page: number = 1): Promise<MovieResponse> {
    return this.makeRequest<MovieResponse>(`/movie/${movieId}/recommendations?page=${page}`);
  }

  /**
   * Get TV show recommendations based on a specific TV show
   * 
   * @param tvId - The TMDB ID of the TV show to get recommendations for
   * @param page - Page number for pagination (default: 1)
   * @returns Promise<TVResponse> - Response containing recommended TV shows
   */
  async getTVRecommendations(tvId: number, page: number = 1): Promise<TVResponse> {
    return this.makeRequest<TVResponse>(`/tv/${tvId}/recommendations?page=${page}`);
  }

  // ==================== VALIDATION METHODS ====================

  /**
   * Validate if a movie ID exists in TMDB database
   * 
   * @param movieId - The TMDB ID to validate
   * @returns Promise<boolean> - True if movie exists, false otherwise
   */
  async validateMovieId(movieId: number): Promise<boolean> {
    try {
      await this.makeRequest<Movie>(`/movie/${movieId}`);
      return true;
    } catch (error) {
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('Movie not found'))) {
        console.log(`Movie ID ${movieId} does not exist in TMDB`);
        return false;
      }
      // For other errors, we'll assume it might exist and let the caller handle it
      console.warn(`Error validating movie ID ${movieId}:`, error);
      return false;
    }
  }

  /**
   * Validate if a TV show ID exists in TMDB database
   * 
   * @param tvId - The TMDB ID to validate
   * @returns Promise<boolean> - True if TV show exists, false otherwise
   */
  async validateTVShowId(tvId: number): Promise<boolean> {
    try {
      await this.makeRequest<TVShow>(`/tv/${tvId}`);
      return true;
    } catch (error) {
      if (error instanceof Error && (error.message.includes('not found') || error.message.includes('TV show not found'))) {
        console.log(`TV show ID ${tvId} does not exist in TMDB`);
        return false;
      }
      // For other errors, we'll assume it might exist and let the caller handle it
      console.warn(`Error validating TV show ID ${tvId}:`, error);
      return false;
    }
  }

  /**
   * Validate if an ID exists as either a movie or TV show
   * 
   * @param id - The TMDB ID to validate
   * @returns Promise<{exists: boolean, type: 'movie' | 'tv' | null}> - Validation result
   */
  async validateContentId(id: number): Promise<{exists: boolean, type: 'movie' | 'tv' | null}> {
    try {
      // Try movie first
      const movieExists = await this.validateMovieId(id);
      if (movieExists) {
        return { exists: true, type: 'movie' };
      }
      
      // Try TV show
      const tvExists = await this.validateTVShowId(id);
      if (tvExists) {
        return { exists: true, type: 'tv' };
      }
      
      return { exists: false, type: null };
    } catch (error) {
      console.warn(`Error validating content ID ${id}:`, error);
      return { exists: false, type: null };
    }
  }

  /**
   * Filter out invalid movie/TV show IDs from a list
   * 
   * @param ids - Array of IDs to validate
   * @returns Promise<number[]> - Array of valid IDs
   */
  async filterValidIds(ids: number[]): Promise<number[]> {
    const validIds: number[] = [];
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const validationPromises = batch.map(async (id) => {
        const result = await this.validateContentId(id);
        return result.exists ? id : null;
      });
      
      const batchResults = await Promise.all(validationPromises);
      validIds.push(...batchResults.filter(id => id !== null) as number[]);
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < ids.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return validIds;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Generate a complete image URL for movie/TV show posters
   * 
   * @param path - The image path from TMDB API response
   * @param size - Image size (w185, w342, w500, w780, original)
   * @returns string - Complete image URL or empty string if no path
   */
  getImageUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  }

  /**
   * Generate a complete image URL for movie/TV show backdrops
   * 
   * @param path - The backdrop path from TMDB API response
   * @param size - Image size (w300, w780, w1280, original)
   * @returns string - Complete backdrop URL or empty string if no path
   */
  getBackdropUrl(path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w780'): string {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  }

  // ==================== DISCOVERY METHODS ====================

  /**
   * Get mixed content (movies and TV shows) for discovery/swiping
   * 
   * This method fetches both popular movies and TV shows, mixes them together,
   * and shuffles the result to provide a diverse content discovery experience.
   * 
   * @param page - Page number for pagination (default: 1)
   * @returns Promise<(Movie | TVShow)[]> - Shuffled array of mixed content
   */
  async getMixedContent(page: number = 1): Promise<(Movie | TVShow)[]> {
    try {
      // Fetch both movies and TV shows in parallel
      const [moviesResponse, tvResponse] = await Promise.all([
        this.getPopularMovies(page),
        this.getPopularTVShows(page)
      ]);

      // Mix movies and TV shows alternately
      const mixedContent: (Movie | TVShow)[] = [];
      const maxItems = Math.max(moviesResponse.results.length, tvResponse.results.length);

      for (let i = 0; i < maxItems; i++) {
        if (i < moviesResponse.results.length) {
          mixedContent.push(moviesResponse.results[i]);
        }
        if (i < tvResponse.results.length) {
          mixedContent.push(tvResponse.results[i]);
        }
      }

      // Shuffle the array for random discovery experience
      return this.shuffleArray(mixedContent);
    } catch (error) {
      console.error('Error fetching mixed content:', error);
      return [];
    }
  }

  /**
   * Private utility method to shuffle an array using Fisher-Yates algorithm
   * 
   * @param array - Array to shuffle
   * @returns T[] - New shuffled array (original array is not modified)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Export a singleton instance of the MovieApiService
// This ensures we only have one instance throughout the app
export const movieApi = new MovieApiService();
