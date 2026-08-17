/**
 * Server-Sent Events (SSE) Service
 * Real-time event broadcaster for live dashboard updates, webhook inspector, and order notifications.
 */

class SSEService {
  constructor() {
    this.clients = new Set();
  }

  /**
   * Adds an SSE client connection
   */
  addClient(res) {
    this.clients.add(res);
    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  /**
   * Broadcasts an event to all connected clients
   * @param {string} type - Event type (e.g. 'order_created', 'order_updated', 'sync_failure', 'webhook_received')
   * @param {object} data - Payload data
   */
  broadcast(type, data) {
    const payload = `event: ${type}\ndata: ${JSON.stringify({ type, timestamp: new Date().toISOString(), ...data })}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

const sseService = new SSEService();
module.exports = sseService;
