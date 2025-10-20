/**
 * ML Data Export Service
 * 
 * Provides functions to export interaction data for machine learning training.
 * Supports JSON and CSV formats compatible with common ML frameworks.
 * 
 * @author Flicksy Team
 * @version 1.0.0
 */

import { getMovieInteractions, getUserInteractions, MovieInteractionAggregate } from './firebaseDb';

/**
 * Export user interactions in JSON format for ML training
 */
export async function exportUserInteractionsJSON(uid: string): Promise<string> {
  try {
    const interactions = await getUserInteractions(uid);
    return JSON.stringify(interactions, null, 2);
  } catch (error) {
    console.error('Error exporting user interactions:', error);
    throw error;
  }
}

/**
 * Export user interactions in CSV format for ML training
 */
export async function exportUserInteractionsCSV(uid: string): Promise<string> {
  try {
    const interactions = await getUserInteractions(uid);
    
    if (interactions.length === 0) {
      return 'movieId,action,timestamp,title,genres,releaseYear,popularity,isMovie\n';
    }
    
    const csvHeaders = 'movieId,action,timestamp,title,genres,releaseYear,popularity,isMovie\n';
    const csvRows = interactions.map(interaction => {
      const { movieId, action, timestamp, movieMetadata } = interaction;
      const { title, genres, releaseYear, popularity, isMovie } = movieMetadata;
      
      // Escape commas and quotes in title
      const escapedTitle = title.replace(/"/g, '""');
      
      return `${movieId},"${action}",${timestamp},"${escapedTitle}","${genres.join(',')}",${releaseYear},${popularity},${isMovie}`;
    });
    
    return csvHeaders + csvRows.join('\n');
  } catch (error) {
    console.error('Error exporting user interactions to CSV:', error);
    throw error;
  }
}

/**
 * Export movie interaction aggregates in JSON format for collaborative filtering
 * @param items Array of {id, isMovie} objects to export
 */
export async function exportMovieAggregatesJSON(items?: Array<{id: number, isMovie: boolean}>): Promise<string> {
  try {
    const aggregates: Record<string, MovieInteractionAggregate> = {};
    
    if (items) {
      // Export specific movies/TV shows
      for (const item of items) {
        const aggregate = await getMovieInteractions(item.id, item.isMovie);
        if (aggregate) {
          const key = `${item.isMovie ? 'movie' : 'tv'}_${item.id}`;
          aggregates[key] = aggregate;
        }
      }
    } else {
      // Note: This would require a different approach to get all movie IDs
      // For now, we'll return an empty object with a note
      console.warn('Exporting all movie aggregates requires additional Firebase query implementation');
    }
    
    return JSON.stringify(aggregates, null, 2);
  } catch (error) {
    console.error('Error exporting movie aggregates:', error);
    throw error;
  }
}

/**
 * Export movie interaction aggregates in CSV format for collaborative filtering
 * @param items Array of {id, isMovie} objects to export
 */
export async function exportMovieAggregatesCSV(items?: Array<{id: number, isMovie: boolean}>): Promise<string> {
  try {
    const csvHeaders = 'compositeKey,id,type,totalLikes,totalDislikes,totalWatchlists,totalSeen,userCount\n';
    
    if (!items || items.length === 0) {
      return csvHeaders;
    }
    
    const csvRows: string[] = [];
    
    for (const item of items) {
      const aggregate = await getMovieInteractions(item.id, item.isMovie);
      if (aggregate) {
        const { totalLikes, totalDislikes, totalWatchlists, totalSeen, userIds } = aggregate;
        const compositeKey = `${item.isMovie ? 'movie' : 'tv'}_${item.id}`;
        const type = item.isMovie ? 'movie' : 'tv';
        csvRows.push(`${compositeKey},${item.id},${type},${totalLikes},${totalDislikes},${totalWatchlists},${totalSeen},${userIds.length}`);
      }
    }
    
    return csvHeaders + csvRows.join('\n');
  } catch (error) {
    console.error('Error exporting movie aggregates to CSV:', error);
    throw error;
  }
}

/**
 * Export training data for recommendation models
 * Combines user interactions with movie metadata
 */
export async function exportTrainingDataJSON(uid: string): Promise<string> {
  try {
    const interactions = await getUserInteractions(uid);
    
    const trainingData = {
      userId: uid,
      interactions: interactions.map(interaction => ({
        movieId: interaction.movieId,
        action: interaction.action,
        timestamp: interaction.timestamp,
        features: {
          title: interaction.movieMetadata.title,
          genres: interaction.movieMetadata.genres,
          releaseYear: interaction.movieMetadata.releaseYear,
          popularity: interaction.movieMetadata.popularity,
          isMovie: interaction.movieMetadata.isMovie,
          // Derived features for ML
          decade: Math.floor(interaction.movieMetadata.releaseYear / 10) * 10,
          isRecent: interaction.movieMetadata.releaseYear >= 2020,
          isPopular: interaction.movieMetadata.popularity > 50
        }
      })),
      summary: {
        totalInteractions: interactions.length,
        likedCount: interactions.filter(i => i.action === 'liked').length,
        dislikedCount: interactions.filter(i => i.action === 'disliked').length,
        watchlistedCount: interactions.filter(i => i.action === 'watchlisted').length,
        seenCount: interactions.filter(i => i.action === 'seen').length,
        uniqueMovies: new Set(interactions.map(i => i.movieId)).size,
        dateRange: {
          earliest: Math.min(...interactions.map(i => i.timestamp)),
          latest: Math.max(...interactions.map(i => i.timestamp))
        }
      }
    };
    
    return JSON.stringify(trainingData, null, 2);
  } catch (error) {
    console.error('Error exporting training data:', error);
    throw error;
  }
}

/**
 * Download data as a file (for web environments)
 */
export function downloadDataAsFile(data: string, filename: string, mimeType: string = 'application/json'): void {
  try {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

/**
 * Export and download user interactions as JSON file
 */
export async function downloadUserInteractionsJSON(uid: string, filename?: string): Promise<void> {
  const data = await exportUserInteractionsJSON(uid);
  const defaultFilename = `user_${uid}_interactions_${new Date().toISOString().split('T')[0]}.json`;
  downloadDataAsFile(data, filename || defaultFilename);
}

/**
 * Export and download user interactions as CSV file
 */
export async function downloadUserInteractionsCSV(uid: string, filename?: string): Promise<void> {
  const data = await exportUserInteractionsCSV(uid);
  const defaultFilename = `user_${uid}_interactions_${new Date().toISOString().split('T')[0]}.csv`;
  downloadDataAsFile(data, filename || defaultFilename, 'text/csv');
}

/**
 * Export and download training data as JSON file
 */
export async function downloadTrainingDataJSON(uid: string, filename?: string): Promise<void> {
  const data = await exportTrainingDataJSON(uid);
  const defaultFilename = `user_${uid}_training_data_${new Date().toISOString().split('T')[0]}.json`;
  downloadDataAsFile(data, filename || defaultFilename);
}
