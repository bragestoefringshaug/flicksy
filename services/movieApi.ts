// TMDB API configuration
const TMDB_API_KEY = 'YOUR_TMDB_API_KEY'; // Replace with your actual API key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  original_title: string;
  popularity: number;
  video: boolean;
}

export interface TVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  original_name: string;
  popularity: number;
  origin_country: string[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface MovieResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export interface TVResponse {
  page: number;
  results: TVShow[];
  total_pages: number;
  total_results: number;
}

export interface GenresResponse {
  genres: Genre[];
}

class MovieApiService {
  private apiKey: string;
  private genreMap: Map<number, string> | null = null;
  private genreMapFetchedAt: number | null = null;

  constructor() {
    // TODO: Replace with your actual TMDB API key
    // Get your free API key from: https://www.themoviedb.org/settings/api
    this.apiKey = "9ab23e9965afab55e8abcb0ecb863749";
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${TMDB_BASE_URL}${endpoint}${separator}api_key=${this.apiKey}`;
    
    console.log('Making API request to:', url);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your TMDB API key in services/movieApi.ts');
        } else if (response.status === 404) {
          console.error(`404 Error - Full URL: ${url}`);
          console.error(`Endpoint: ${endpoint}`);
          // For movie/TV endpoints, this might be a missing resource
          if (endpoint.includes('/movie/') || endpoint.includes('/tv/')) {
            throw new Error(`Movie/TV show not found: ${endpoint}. This content may not exist in TMDB database.`);
          } else {
            throw new Error(`API endpoint not found: ${endpoint}. Please check the endpoint URL.`);
          }
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private async ensureGenreMap(): Promise<void> {
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
    const now = Date.now();
    if (this.genreMap && this.genreMapFetchedAt && now - this.genreMapFetchedAt < CACHE_TTL_MS) {
      return;
    }
    try {
      const [movieGenres, tvGenres] = await Promise.all([
        this.getMovieGenres(),
        this.getTVGenres(),
      ]);
      const map = new Map<number, string>();
      for (const g of movieGenres.genres) map.set(g.id, g.name);
      for (const g of tvGenres.genres) map.set(g.id, g.name);
      this.genreMap = map;
      this.genreMapFetchedAt = now;
    } catch (e) {
      // On failure, keep prior cache if any; otherwise leave null
      console.error('Failed to fetch genres:', e);
    }
  }

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
  async getPopularMovies(page: number = 1): Promise<MovieResponse> {
    return this.makeRequest<MovieResponse>(`/movie/popular?page=${page}`);
  }

  // Get top rated movies
  async getTopRatedMovies(page: number = 1): Promise<MovieResponse> {
    return this.makeRequest<MovieResponse>(`/movie/top_rated?page=${page}`);
  }

  // Get trending movies
  async getTrendingMovies(page: number = 1): Promise<MovieResponse> {
    return this.makeRequest<MovieResponse>(`/trending/movie/week?page=${page}`);
  }

  // Get popular TV shows
  async getPopularTVShows(page: number = 1): Promise<TVResponse> {
    return this.makeRequest<TVResponse>(`/tv/popular?page=${page}`);
  }

  // Get top rated TV shows
  async getTopRatedTVShows(page: number = 1): Promise<TVResponse> {
    return this.makeRequest<TVResponse>(`/tv/top_rated?page=${page}`);
  }

  // Get trending TV shows
  async getTrendingTVShows(page: number = 1): Promise<TVResponse> {
    return this.makeRequest<TVResponse>(`/trending/tv/week?page=${page}`);
  }

  // Get movie genres
  async getMovieGenres(): Promise<GenresResponse> {
    return this.makeRequest<GenresResponse>('/genre/movie/list');
  }

  // Get TV genres
  async getTVGenres(): Promise<GenresResponse> {
    return this.makeRequest<GenresResponse>('/genre/tv/list');
  }

  // Get movie details
  async getMovieDetails(movieId: number): Promise<Movie> {
    return this.makeRequest<Movie>(`/movie/${movieId}`);
  }

  // Get TV show details
  async getTVShowDetails(tvId: number): Promise<TVShow> {
    return this.makeRequest<TVShow>(`/tv/${tvId}`);
  }

  // Search movies
  async searchMovies(query: string, page: number = 1): Promise<MovieResponse> {
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest<MovieResponse>(`/search/movie?query=${encodedQuery}&page=${page}`);
  }

  // Search TV shows
  async searchTVShows(query: string, page: number = 1): Promise<TVResponse> {
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest<TVResponse>(`/search/tv?query=${encodedQuery}&page=${page}`);
  }

  // Get recommendations based on liked movies
  async getMovieRecommendations(movieId: number, page: number = 1): Promise<MovieResponse> {
    return this.makeRequest<MovieResponse>(`/movie/${movieId}/recommendations?page=${page}`);
  }

  // Get recommendations based on liked TV shows
  async getTVRecommendations(tvId: number, page: number = 1): Promise<TVResponse> {
    return this.makeRequest<TVResponse>(`/tv/${tvId}/recommendations?page=${page}`);
  }

  // Get image URL
  getImageUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  }

  // Get backdrop URL
  getBackdropUrl(path: string | null, size: 'w300' | 'w780' | 'w1280' | 'original' = 'w780'): string {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  }

  // Get mixed content (movies and TV shows) for discovery
  async getMixedContent(page: number = 1): Promise<(Movie | TVShow)[]> {
    try {
      const [moviesResponse, tvResponse] = await Promise.all([
        this.getPopularMovies(page),
        this.getPopularTVShows(page)
      ]);

      // Mix movies and TV shows
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

      // Shuffle the array
      return this.shuffleArray(mixedContent);
    } catch (error) {
      console.error('Error fetching mixed content:', error);
      return [];
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const movieApi = new MovieApiService();
