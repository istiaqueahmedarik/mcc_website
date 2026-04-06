import { Context } from 'hono';
import sql from '../db';

export const getRandomWords = async (c: Context) => {
  const limit = c.req.query('limit') || '100';
  const difficulty = c.req.query('difficulty'); // optional: 1, 2, or 3
  
  try {
    let query;
    const params: any[] = [];
    
    if (difficulty) {
      const diff = parseInt(difficulty);
      query = sql`
        SELECT id, word, difficulty, length 
        FROM words 
        WHERE difficulty = ${diff}
        ORDER BY RANDOM() 
        LIMIT ${parseInt(limit)}
      `;
    } else {
      query = sql`
        SELECT id, word, difficulty, length 
        FROM words 
        ORDER BY RANDOM() 
        LIMIT ${parseInt(limit)}
      `;
    }
    
    const results = await query;
    
    return c.json({
      success: true,
      count: results.length,
      words: results
    });
  } catch (error) {
    console.error('Error fetching random words:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch words'
    }, 500);
  }
};
