/**
 * Database Error Handler Utility
 * Provides consistent error handling for database operations across controllers
 */

export interface DatabaseError extends Error {
    code?: string;
    constraint?: string;
    detail?: string;
    table?: string;
    column?: string;
}

export class DatabaseErrorHandler {
    static handleError(error: DatabaseError, operation: string = 'Database operation') {
        console.error(`${operation} error:`, error.message);

        // Handle connection-related errors
        if (error.code === 'CONNECTION_CLOSED' || error.code === 'CONNECTION_ENDED') {
            return {
                status: 503,
                message: "Database connection issue. Please try again."
            };
        }

        // Handle timeout errors
        if (error.code === 'CONNECT_TIMEOUT') {
            return {
                status: 503,
                message: "Database connection timeout. Please try again."
            };
        }

        // Handle prepared statement errors (should not happen with transaction mode)
        if (error.code === '26000') {
            console.error('Prepared statement error - this should not happen with transaction mode');
            return {
                status: 500,
                message: "Database configuration issue. Please contact support."
            };
        }

        // Handle unique constraint violations
        if (error.code === '23505') {
            const detail = error.detail || '';
            if (detail.includes('email')) {
                return {
                    status: 400,
                    message: "Email already exists"
                };
            }
            if (detail.includes('vjudge_id')) {
                return {
                    status: 400,
                    message: "VJudge ID already exists"
                };
            }
            return {
                status: 400,
                message: "Duplicate entry found"
            };
        }

        // Handle foreign key constraint violations
        if (error.code === '23503') {
            return {
                status: 400,
                message: "Invalid reference. Related record not found."
            };
        }

        // Handle not null constraint violations
        if (error.code === '23502') {
            return {
                status: 400,
                message: "Required field is missing"
            };
        }

        // Handle syntax errors
        if (error.code === '42601') {
            console.error('SQL syntax error:', error.message);
            return {
                status: 500,
                message: "Database query error. Please contact support."
            };
        }

        // Handle undefined table/column errors
        if (error.code === '42P01' || error.code === '42703') {
            console.error('Database schema error:', error.message);
            return {
                status: 500,
                message: "Database schema error. Please contact support."
            };
        }

        // Handle permission errors
        if (error.code === '42501') {
            console.error('Database permission error:', error.message);
            return {
                status: 500,
                message: "Database permission error. Please contact support."
            };
        }

        // Default error handling
        console.error('Unhandled database error:', error);
        return {
            status: 500,
            message: `${operation} failed. Please try again.`
        };
    }

    /**
     * Wrapper function for database operations with automatic error handling
     */
    static async executeWithErrorHandling<T>(
        operation: () => Promise<T>,
        operationName: string = 'Database operation'
    ): Promise<{ success: true; data: T } | { success: false; error: { status: number; message: string } }> {
        try {
            const data = await operation();
            return { success: true, data };
        } catch (error) {
            const errorInfo = this.handleError(error as DatabaseError, operationName);
            return { success: false, error: errorInfo };
        }
    }
}

/**
 * Helper function for Hono responses with database error handling
 */
export function respondWithDbError(c: any, error: { status: number; message: string }) {
    return c.json({ error: error.message }, error.status);
}