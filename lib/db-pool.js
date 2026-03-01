/**
 * Database Connection Pool Manager
 * 
 * Manages Supabase connection pooling for high-load scenarios.
 * Implements connection reuse, health checking, and auto-reconnect.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class DatabasePool {
  constructor(config = {}) {
    this.maxConnections = config.maxConnections || 10;
    this.minConnections = config.minConnections || 2;
    this.idleTimeout = config.idleTimeout || 30000; // 30s
    this.connectionTimeout = config.connectionTimeout || 10000; // 10s
    this.healthCheckInterval = config.healthCheckInterval || 60000; // 60s

    this.pool = [];
    this.activeConnections = 0;
    this.waitQueue = [];
    this.stats = {
      totalRequests: 0,
      poolHits: 0,
      poolMisses: 0,
      errors: 0,
      avgWaitTime: 0
    };

    this.isInitialized = false;
    this.healthCheckTimer = null;
  }

  /**
   * Initialize the connection pool
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🔌 Initializing database connection pool...');
    console.log(`   Min: ${this.minConnections}, Max: ${this.maxConnections}`);

    // Create minimum connections
    for (let i = 0; i < this.minConnections; i++) {
      await this.createConnection();
    }

    // Start health check
    this.startHealthCheck();

    this.isInitialized = true;
    console.log('✅ Database pool initialized');
  }

  /**
   * Create a new Supabase connection
   */
  async createConnection() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-pool-connection': 'true'
        }
      }
    });

    const connection = {
      client,
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      inUse: false,
      healthy: true,
      useCount: 0
    };

    this.pool.push(connection);
    return connection;
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire() {
    this.stats.totalRequests++;
    const startTime = Date.now();

    // Find an available connection
    let connection = this.pool.find(c => !c.inUse && c.healthy);

    if (connection) {
      // Pool hit
      this.stats.poolHits++;
      connection.inUse = true;
      connection.lastUsed = Date.now();
      connection.useCount++;
      this.activeConnections++;
      
      const waitTime = Date.now() - startTime;
      this.updateAvgWaitTime(waitTime);
      
      return connection;
    }

    // Pool miss - try to create new connection if under max
    if (this.pool.length < this.maxConnections) {
      this.stats.poolMisses++;
      connection = await this.createConnection();
      connection.inUse = true;
      connection.lastUsed = Date.now();
      connection.useCount++;
      this.activeConnections++;
      
      const waitTime = Date.now() - startTime;
      this.updateAvgWaitTime(waitTime);
      
      return connection;
    }

    // Pool exhausted - wait for available connection
    console.warn('⚠️  Pool exhausted, waiting for available connection...');
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.waitQueue.findIndex(w => w.resolve === resolve);
        if (idx !== -1) this.waitQueue.splice(idx, 1);
        reject(new Error('Connection acquisition timeout'));
      }, this.connectionTimeout);

      this.waitQueue.push({ resolve, reject, timeout, startTime });
    });
  }

  /**
   * Release a connection back to the pool
   */
  release(connection) {
    if (!connection) return;

    connection.inUse = false;
    connection.lastUsed = Date.now();
    this.activeConnections--;

    // Process wait queue if any
    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift();
      clearTimeout(waiter.timeout);
      
      connection.inUse = true;
      connection.useCount++;
      this.activeConnections++;
      
      const waitTime = Date.now() - waiter.startTime;
      this.updateAvgWaitTime(waitTime);
      
      waiter.resolve(connection);
    }

    // Clean up idle connections if pool is oversized
    this.cleanupIdleConnections();
  }

  /**
   * Get a client with auto-release
   */
  async getClient() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const connection = await this.acquire();
    
    return {
      client: connection.client,
      release: () => this.release(connection)
    };
  }

  /**
   * Execute a query with automatic connection management
   */
  async execute(callback) {
    const { client, release } = await this.getClient();
    
    try {
      const result = await callback(client);
      release();
      return result;
    } catch (error) {
      release();
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Clean up idle connections
   */
  cleanupIdleConnections() {
    if (this.pool.length <= this.minConnections) return;

    const now = Date.now();
    const idleConnections = this.pool.filter(
      c => !c.inUse && (now - c.lastUsed) > this.idleTimeout
    );

    // Remove excess idle connections
    const excess = this.pool.length - this.minConnections;
    const toRemove = Math.min(idleConnections.length, excess);

    for (let i = 0; i < toRemove; i++) {
      const idx = this.pool.indexOf(idleConnections[i]);
      if (idx !== -1) {
        this.pool.splice(idx, 1);
      }
    }

    if (toRemove > 0) {
      console.log(`🧹 Cleaned up ${toRemove} idle connections`);
    }
  }

  /**
   * Health check for all connections
   */
  async healthCheck() {
    console.log('🏥 Running pool health check...');
    
    for (const connection of this.pool) {
      if (connection.inUse) continue;

      try {
        // Simple query to test connection
        const { error } = await connection.client
          .from('tasks')
          .select('id')
          .limit(1);

        connection.healthy = !error;
        
        if (error) {
          console.error(`❌ Unhealthy connection ${connection.id}: ${error.message}`);
        }
      } catch (err) {
        connection.healthy = false;
        console.error(`❌ Health check failed for ${connection.id}`);
      }
    }

    // Remove unhealthy connections and create replacements
    const unhealthy = this.pool.filter(c => !c.healthy && !c.inUse);
    for (const conn of unhealthy) {
      const idx = this.pool.indexOf(conn);
      if (idx !== -1) {
        this.pool.splice(idx, 1);
        
        // Create replacement if below minimum
        if (this.pool.length < this.minConnections) {
          await this.createConnection();
        }
      }
    }

    console.log(`✅ Health check complete. Pool size: ${this.pool.length}`);
  }

  /**
   * Start periodic health checks
   */
  startHealthCheck() {
    this.healthCheckTimer = setInterval(
      () => this.healthCheck(),
      this.healthCheckInterval
    );
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      poolSize: this.pool.length,
      activeConnections: this.activeConnections,
      idleConnections: this.pool.filter(c => !c.inUse).length,
      healthyConnections: this.pool.filter(c => c.healthy).length,
      queueLength: this.waitQueue.length,
      hitRate: this.stats.totalRequests > 0 
        ? (this.stats.poolHits / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Update average wait time
   */
  updateAvgWaitTime(newTime) {
    const alpha = 0.2; // Exponential moving average weight
    this.stats.avgWaitTime = (alpha * newTime) + ((1 - alpha) * this.stats.avgWaitTime);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down database pool...');
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Wait for active connections to finish (with timeout)
    const shutdownTimeout = 30000;
    const startTime = Date.now();
    
    while (this.activeConnections > 0 && (Date.now() - startTime) < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.activeConnections > 0) {
      console.warn(`⚠️  Force closing ${this.activeConnections} active connections`);
    }

    this.pool = [];
    this.isInitialized = false;
    
    console.log('✅ Database pool shutdown complete');
  }
}

// Singleton instance
let poolInstance = null;

function getPool(config) {
  if (!poolInstance) {
    poolInstance = new DatabasePool(config);
  }
  return poolInstance;
}

module.exports = {
  DatabasePool,
  getPool
};
